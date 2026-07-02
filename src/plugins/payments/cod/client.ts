import type { PaymentAdapterClient } from '@payloadcms/plugin-ecommerce/types'

export type CodAdapterClientArgs = {
  label?: string
}

export const codAdapterClient = (props?: CodAdapterClientArgs): PaymentAdapterClient => {
  return {
    name: 'cod',
    confirmOrder: true,
    initiatePayment: true,
    label: props?.label || 'Cash on Delivery',
  }
}
