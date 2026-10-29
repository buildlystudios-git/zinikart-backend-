import type { Endpoint } from 'payload'

export const retailerStatusEndpoint: Endpoint = {
  path: '/status',
  method: 'patch',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ success: false, reason: 'Unauthorized' }, { status: 401 })
    }

    try {
      // 1. Parse request body
      const body = typeof req.json === 'function' ? await req.json() : req.body

      const { onlineStatus } = body

      if (onlineStatus !== 'online' && onlineStatus !== 'offline') {
        return Response.json({ success: false, reason: 'Invalid onlineStatus. Must be "online" or "offline".' }, { status: 400 })
      }

      // 2. Find the retailer profile for the current user
      const docs = await req.payload.find({
        collection: 'retailers',
        where: { user: { equals: req.user.id } },
        limit: 1,
        req,
      })

      if (!docs.docs.length) {
        return Response.json({ success: false, reason: 'Retailer profile not found' }, { status: 404 })
      }

      const retailer = docs.docs[0]

      // 3. Update the onlineStatus field
      const updatedRetailer = await req.payload.update({
        collection: 'retailers',
        id: retailer.id,
        data: {
          onlineStatus,
        },
        req, // Passing req enforces access control automatically
      })

      return Response.json({
        success: true,
        onlineStatus: updatedRetailer.onlineStatus,
      })
    } catch (error: any) {
      req.payload.logger.error(`Error updating retailer status: ${error.message}`)
      return Response.json({ success: false, reason: 'Internal Server Error' }, { status: 500 })
    }
  },
}
