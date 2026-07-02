import type { Access } from 'payload'

export const orderUpdateAccess: Access = async ({ req }) => {
  const user = req.user
  if (!user) return false

  // Admins have full access
  if (user.roles?.includes('admin')) {
    return true
  }

  // Delivery partners can update their assigned orders
  if (user.roles?.includes('delivery_partner')) {
    try {
      const deliveryPartnerDocs = await req.payload.find({
        collection: 'delivery-partners',
        where: {
          user: {
            equals: user.id,
          },
        },
        depth: 0,
        overrideAccess: true,
        req,
      })

      const partnerId = deliveryPartnerDocs.docs[0]?.id
      if (partnerId) {
        return {
          deliveryPartner: {
            equals: partnerId,
          },
        }
      }
    } catch (err: any) {
      req.payload.logger.error(`Error in orderUpdateAccess looking up delivery partner profile: ${err.message}`)
    }
  }

  return false
}
