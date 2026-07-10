import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'

export const handoverOtpValidation: CollectionBeforeValidateHook = async ({ data, originalDoc, req, operation }) => {
  if (!data) return data
  if (operation === 'update' && originalDoc) {
    if (data.status === ORDER_STATUS.PICKED_UP && originalDoc.status !== ORDER_STATUS.PICKED_UP) {
      if (!req.context?.providedPickupOTP || req.context.providedPickupOTP !== originalDoc.pickupOTP) {
        throw new APIError('Invalid Pickup OTP', 400)
      }
      
      if (!originalDoc.deliveryPartner || originalDoc.deliveryPartnerAcceptance !== 'accepted') {
        throw new APIError('Cannot pick up unassigned order', 400)
      }
    }
    
    if (data.status === ORDER_STATUS.DELIVERED && originalDoc.status !== ORDER_STATUS.DELIVERED) {
      if (!req.context?.providedDeliveryOTP || req.context.providedDeliveryOTP !== originalDoc.deliveryOTP) {
        throw new APIError('Invalid Delivery OTP', 400)
      }
      
      const txs = await req.payload.find({
        collection: 'transactions',
        where: { order: { equals: originalDoc.id } },
        depth: 0,
        req,
      })
      
      const hasCodTx = txs.docs.some((tx: any) => tx.paymentMethod === 'cod')
      if (hasCodTx && originalDoc.codCollectionRecord?.status !== 'collected') {
        throw new APIError('COD payment must be collected before delivery', 400)
      }
    }
  }
  return data
}
