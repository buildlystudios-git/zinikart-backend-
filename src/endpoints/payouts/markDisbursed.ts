import type { Endpoint } from 'payload'
import { checkRole } from '@/access/utilities'

export const markDisbursedEndpoint: Endpoint = {
  path: '/:id/mark-disbursed',
  method: 'post',
  handler: async (req) => {
    if (!req.user || !checkRole(['admin'], req.user)) {
      return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    }

    const { id } = req.routeParams as { id: string }
    const { payoutRef } = typeof req.json === 'function' ? await req.json() : req.body
    const payload = req.payload

    if (!payoutRef) {
      return Response.json({ success: false, reason: 'payoutRef is required' }, { status: 400 })
    }

    try {
      const invoice = await payload.findByID({
        collection: 'payout-invoices',
        id,
        depth: 0,
        req,
      })

      if (!invoice) {
        return Response.json({ success: false, reason: 'Invoice not found' }, { status: 404 })
      }

      if (invoice.status === 'paid') {
        return Response.json({ success: false, reason: 'Invoice is already paid' }, { status: 400 })
      }

      const now = new Date().toISOString()

      // Update invoice
      await payload.update({
        collection: 'payout-invoices',
        id,
        data: {
          status: 'paid',
          paidAt: now,
          payoutRef,
        },
        req,
      })

      // Update linked ledgers
      const ledgers = await payload.find({
        collection: 'payout-ledger',
        where: { payoutInvoice: { equals: id } },
        depth: 0,
        limit: 1000,
        req,
      })

      for (const ledger of ledgers.docs) {
        await payload.update({
          collection: 'payout-ledger',
          id: ledger.id,
          data: {
            status: 'paid',
            paidAt: now,
            payoutRef,
          },
          req,
        })
      }

      return Response.json({ success: true })
    } catch (error: any) {
      payload.logger.error(`Error in markDisbursedEndpoint: ${error.message}`)
      return Response.json({ success: false, reason: error.message }, { status: 500 })
    }
  }
}
