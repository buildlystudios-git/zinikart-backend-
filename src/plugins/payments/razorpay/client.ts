import type { PaymentAdapterClient } from '@payloadcms/plugin-ecommerce/types'

export type RazorpayAdapterClientArgs = {
  label?: string
}

export const razorpayAdapterClient = (props?: RazorpayAdapterClientArgs): PaymentAdapterClient => {
  return {
    name: 'razorpay',
    confirmOrder: true,
    initiatePayment: true,
    label: props?.label || 'Razorpay',
  }
}
