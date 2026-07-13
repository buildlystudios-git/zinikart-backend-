import type { CollectionBeforeChangeHook } from 'payload'

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

export const generateOtps: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (operation === 'create') {
    if (!data.pickupOTP) data.pickupOTP = generateOtp()
    if (!data.deliveryOTP) data.deliveryOTP = generateOtp()
    console.log(`Generated OTPs: Pickup=${data.pickupOTP}, Delivery=${data.deliveryOTP}`)
  }
  return data
}
