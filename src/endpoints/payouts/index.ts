import type { Endpoint } from 'payload'

export const myLedgerEndpoint: Endpoint = {
  path: '/mobile/payouts/my-ledger',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    }

    const payload = req.payload
    const url = new URL(req.url as string)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const status = url.searchParams.get('status')

    try {
      const where: any = {
        recipient: { equals: req.user.id }
      }
      
      if (status) {
        where.status = { equals: status }
      }

      const ledgers = await payload.find({
        collection: 'payout-ledger',
        where,
        page,
        limit,
        sort: '-createdAt',
        overrideAccess: false,
        req,
      })

      return Response.json({ success: true, data: ledgers })
    } catch (error: any) {
      payload.logger.error(`Error in myLedgerEndpoint: ${error.message}`)
      return Response.json({ success: false, reason: error.message }, { status: 500 })
    }
  }
}

export const myInvoicesEndpoint: Endpoint = {
  path: '/mobile/payouts/my-invoices',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    }

    const payload = req.payload
    const url = new URL(req.url as string)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)

    try {
      const invoices = await payload.find({
        collection: 'payout-invoices',
        where: {
          recipient: { equals: req.user.id }
        },
        page,
        limit,
        sort: '-createdAt',
        overrideAccess: false,
        req,
      })

      return Response.json({ success: true, data: invoices })
    } catch (error: any) {
      payload.logger.error(`Error in myInvoicesEndpoint: ${error.message}`)
      return Response.json({ success: false, reason: error.message }, { status: 500 })
    }
  }
}

export const invoiceDetailEndpoint: Endpoint = {
  path: '/mobile/payouts/invoices/:id',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    }

    const { id } = req.routeParams as { id: string }
    const payload = req.payload

    try {
      const invoice = await payload.findByID({
        collection: 'payout-invoices',
        id,
        overrideAccess: false,
        req,
      })

      if (!invoice) {
        return Response.json({ success: false, reason: 'Not found' }, { status: 404 })
      }

      return Response.json({ success: true, data: invoice })
    } catch (error: any) {
      payload.logger.error(`Error in invoiceDetailEndpoint: ${error.message}`)
      return Response.json({ success: false, reason: error.message }, { status: 500 })
    }
  }
}
