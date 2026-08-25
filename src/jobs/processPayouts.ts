import type { TaskHandler } from 'payload'

export const processPayoutsTask: TaskHandler<any> = async ({ req }) => {
  const payload = req.payload
  
  try {
    // 1. Fetch PlatformSettings
    const platformSettings = await payload.findGlobal({
      slug: 'platform-settings',
      req,
    })

    const minPayout = (platformSettings.minPayoutAmountINR as number) || 100
    const payoutMode = platformSettings.payoutMode as 'manual' | 'auto'

    // 2. Advance pending -> eligible for records where eligibleAt <= now
    const now = new Date().toISOString()
    
    // Payload doesn't have bulk update easily with where clause for less_than, so we fetch and update individually
    const pendingLedgers = await payload.find({
      collection: 'payout-ledger',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { eligibleAt: { less_than_equal: now } }
        ]
      },
      limit: 1000,
      depth: 0,
      req,
    })

    for (const ledger of pendingLedgers.docs) {
      await payload.update({
        collection: 'payout-ledger',
        id: ledger.id,
        data: { status: 'eligible' },
        req,
      })
    }

    // 3. Find all eligible ledgers
    const eligibleLedgers = await payload.find({
      collection: 'payout-ledger',
      where: { status: { equals: 'eligible' } },
      limit: 1000,
      depth: 0,
      req,
    })

    if (eligibleLedgers.totalDocs === 0) {
      return { output: { success: true, message: 'No eligible payouts' } }
    }

    // Group by recipient
    const recipientGroups: Record<string, typeof eligibleLedgers.docs> = {}
    for (const ledger of eligibleLedgers.docs) {
      const recipientId = typeof ledger.recipient === 'object' ? ledger.recipient.id : ledger.recipient
      if (recipientId) {
        if (!recipientGroups[recipientId]) recipientGroups[recipientId] = []
        recipientGroups[recipientId].push(ledger)
      }
    }

    // 4. Process each recipient group
    for (let [recipientId, ledgers] of Object.entries(recipientGroups)) {
      const validLedgers = []
      for (const ledger of ledgers) {
        const orderId = typeof ledger.order === 'object' ? ledger.order.id : ledger.order
        const orderDoc = await payload.findByID({
          collection: 'orders',
          id: orderId as string,
          depth: 0,
          req,
        })
        
        // TODO: Update this condition when 'returned' order status is added
        if (orderDoc && orderDoc.status === 'cancelled') {
          payload.logger.warn(`Skipping ledger ${ledger.id} because order ${orderId} is cancelled.`)
          await payload.update({
             collection: 'payout-ledger',
             id: ledger.id,
             data: { status: 'on_hold', adminNotes: 'Order cancelled, payout suspended by processPayouts.' },
             req,
          })
          continue
        }
        validLedgers.push(ledger)
      }

      if (validLedgers.length === 0) continue
      ledgers = validLedgers

      const totalNet = ledgers.reduce((acc, l) => acc + (l.netAmount as number), 0)
      const recipientType = ledgers[0].recipientType

      if (totalNet < minPayout) {
        payload.logger.info(`Skipping payout for recipient ${recipientId} - total ${totalNet} below min ${minPayout}`)
        continue
      }

      // Mark ledgers as processing
      for (const ledger of ledgers) {
        await payload.update({
          collection: 'payout-ledger',
          id: ledger.id,
          data: { status: 'processing' },
          req,
        })
      }

      let defaultMethod = null
      
      // Fetch default payment method
      if (recipientType === 'retailer') {
        const retailers = await payload.find({
          collection: 'retailers',
          where: { user: { equals: recipientId } },
          depth: 0,
          req,
        })
        const methods = retailers.docs[0]?.paymentMethods || []
        defaultMethod = methods.find((m: any) => m.isDefault) || methods[0]
      } else {
        const dps = await payload.find({
          collection: 'delivery-partners',
          where: { user: { equals: recipientId } },
          depth: 0,
          req,
        })
        const methods = dps.docs[0]?.paymentMethods || []
        defaultMethod = methods.find((m: any) => m.isDefault) || methods[0]
      }

      if (!defaultMethod) {
        for (const ledger of ledgers) {
          await payload.update({
            collection: 'payout-ledger',
            id: ledger.id,
            data: { status: 'on_hold', failureReason: 'No default payment method' },
            req,
          })
        }
        continue
      }

      const payoutDestination = {
        methodType: defaultMethod.methodType,
        accountHolderName: defaultMethod.accountHolderName,
        accountNumber: defaultMethod.accountNumber ? `****${defaultMethod.accountNumber.slice(-4)}` : undefined,
        ifscCode: defaultMethod.ifscCode,
        upiId: defaultMethod.upiId,
      }

      const lineItems = ledgers.map(l => ({
        orderRef: typeof l.order === 'object' ? l.order.id : l.order,
        grossAmount: l.grossAmount,
        platformFeePercent: l.platformFeePercent,
        platformFeeAmount: l.platformFeeAmount,
        netAmount: l.netAmount,
        deliveredAt: l.deliveredAt,
      }))

      const sortedByEligibleAt = [...ledgers].sort(
        (a, b) => new Date(a.eligibleAt as string).getTime() - new Date(b.eligibleAt as string).getTime()
      )
      const periodFrom = sortedByEligibleAt[0]?.eligibleAt ?? now
      const periodTo = now

      // Create Draft Invoice
      const invoice = await payload.create({
        collection: 'payout-invoices',
        data: {
          invoiceNumber: '', // populated by hook
          invoiceType: recipientType,
          recipient: recipientId,
          retailerProfile: recipientType === 'retailer' ? (typeof ledgers[0].retailerProfile === 'object' ? ledgers[0].retailerProfile?.id : ledgers[0].retailerProfile) : undefined,
          deliveryPartnerProfile: recipientType === 'delivery_partner' ? (typeof ledgers[0].deliveryPartnerProfile === 'object' ? ledgers[0].deliveryPartnerProfile?.id : ledgers[0].deliveryPartnerProfile) : undefined,
          period: {
            from: periodFrom,
            to: periodTo,
          },
          lineItems,
          totalGross: 0,
          totalFees: 0,
          totalNet: 0,
          payoutDestination,
          status: 'draft',
        },
        req,
      })

      // Link ledgers to invoice
      for (const ledger of ledgers) {
        await payload.update({
          collection: 'payout-ledger',
          id: ledger.id,
          data: { payoutInvoice: invoice.id },
          req,
        })
      }

      if (payoutMode === 'manual') {
        await payload.update({
          collection: 'payout-invoices',
          id: invoice.id,
          data: { status: 'issued', issuedAt: new Date().toISOString() },
          req,
        })
      } else if (payoutMode === 'auto') {
        try {
          const rxGroup = platformSettings.razorpayXGroup as any
          if (!rxGroup?.razorpayXAccountNumber || !rxGroup?.razorpayXKeyId || !rxGroup?.razorpayXKeySecret) {
            throw new Error('Razorpay X credentials missing in Platform Settings')
          }
          
          await callRazorpayXPayout(payoutDestination, totalNet, invoice.id, platformSettings)
          
          await payload.update({
            collection: 'payout-invoices',
            id: invoice.id,
            data: { status: 'paid', paidAt: new Date().toISOString() },
            req,
          })
          
          for (const ledger of ledgers) {
            await payload.update({
              collection: 'payout-ledger',
              id: ledger.id,
              data: { status: 'paid', paidAt: new Date().toISOString() },
              req,
            })
          }
        } catch (error: any) {
          payload.logger.error(`Auto payout failed for invoice ${invoice.id}: ${error.message}`)
          await payload.update({
            collection: 'payout-invoices',
            id: invoice.id,
            data: { status: 'issued', issuedAt: new Date().toISOString(), adminNotes: `Auto payout failed: ${error.message}` },
            req,
          })
          
          for (const ledger of ledgers) {
            await payload.update({
              collection: 'payout-ledger',
              id: ledger.id,
              data: { status: 'failed', failureReason: error.message },
              req,
            })
          }
        }
      }
    }

    return { output: { success: true } }
  } catch (error: any) {
    payload.logger.error(`Error in processPayoutsTask: ${error.message}`)
    throw error
  }
}

async function callRazorpayXPayout(destination: any, amount: number, ref: string, settings: any) {
  // TODO: Implement Razorpay X payout logic here.
  // 1. Setup basic auth with settings.razorpayXKeyId and settings.razorpayXKeySecret
  // 2. Call POST https://api.razorpay.com/v1/payouts
  // 3. Provide settings.razorpayXAccountNumber as account_number
  // 4. Map 'destination' to fund_account structure.
  throw new Error('Razorpay X not implemented')
}
