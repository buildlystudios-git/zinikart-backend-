import type { TaskHandler } from 'payload'
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '@/constants/env'

export const processRazorpayRefundTask: TaskHandler<any> = async ({ req, input }) => {
  const { transactionId } = input as { transactionId: string }
  const payload = req.payload
  
  try {
    const tx = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 0,
      overrideAccess: true,
    })

    if (!tx || tx.paymentMethod !== 'razorpay' || !tx.razorpay?.paymentID) {
      return { output: { success: false, reason: 'Invalid transaction for refund' } }
    }

    if (tx.razorpay.refundStatus === 'processed') {
       return { output: { success: true, reason: 'Already refunded' } }
    }

    const razorpayKey = RAZORPAY_KEY_ID
    const razorpaySecret = RAZORPAY_KEY_SECRET

    if (!razorpayKey || !razorpaySecret) {
      throw new Error('Razorpay credentials missing')
    }

    // Call Razorpay API to process refund
    const basicAuth = Buffer.from(`${razorpayKey}:${razorpaySecret}`).toString('base64')
    
    const amountToRefund = typeof (tx as any).amount === 'number' ? Math.round((tx as any).amount * 100) : 0
    if (amountToRefund <= 0) {
      return { output: { success: false, reason: 'Invalid refund amount' } }
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${tx.razorpay.paymentID}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        amount: amountToRefund,
        notes: {
          transactionId: tx.id
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      payload.logger.error(`Razorpay refund failed for tx ${tx.id}: ${JSON.stringify(data)}`)
      
      await payload.update({
        collection: 'transactions',
        id: tx.id,
        data: {
          razorpay: {
            ...tx.razorpay,
            refundStatus: 'failed',
          }
        },
        req,
      })
      
      throw new Error(`Refund failed: ${data.error?.description || 'Unknown error'}`)
    }

    await payload.update({
      collection: 'transactions',
      id: tx.id,
      data: {
        razorpay: {
          ...tx.razorpay,
          refundID: data.id,
          refundStatus: 'processed',
          refundedAmount: data.amount / 100,
          refundedAt: new Date().toISOString()
        }
      },
      req,
    })

    return { output: { success: true, refundId: data.id } }
  } catch (error) {
    payload.logger.error(`Error processing refund for tx ${transactionId}: ${error}`)
    throw error
  }
}
