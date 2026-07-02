import type { Field, GroupField, PayloadRequest } from 'payload'
import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'

type InitiatePayment = PaymentAdapter['initiatePayment']
type ConfirmOrder = PaymentAdapter['confirmOrder']

type InitiatePaymentReturnType = {
  amount: number
  currency: string
  transactionID: string
  message: string
}

const sanitizeAddress = (addr: any) => {
  if (!addr) return undefined
  return {
    title: addr.title || undefined,
    firstName: addr.firstName || undefined,
    lastName: addr.lastName || undefined,
    company: addr.company || undefined,
    addressLine1: addr.addressLine1 || undefined,
    addressLine2: addr.addressLine2 || undefined,
    city: addr.city || undefined,
    state: addr.state || undefined,
    postalCode: addr.postalCode || undefined,
    country: addr.country || undefined,
    phone: addr.phone || undefined,
    lat: typeof addr.lat === 'number' ? addr.lat : undefined,
    lng: typeof addr.lng === 'number' ? addr.lng : undefined,
  }
}

export const codAdapter = (): PaymentAdapter => {
  const label = 'Cash on Delivery'

  const groupField: GroupField = {
    name: 'cod',
    type: 'group',
    admin: {
      condition: (data) => {
        return data?.paymentMethod === 'cod'
      },
    },
    fields: [
      {
        name: 'notes',
        type: 'text',
        label: 'COD Notes',
      },
    ],
  }

  const initiatePayment: InitiatePayment = async ({
    data,
    req,
    transactionsSlug,
  }) => {
    const payload = req.payload
    const customerEmail = data.customerEmail
    const currency = data.currency || 'INR'
    const cart = data.cart
    const amount = cart.subtotal
    const billingAddressFromData = sanitizeAddress(data.billingAddress)
    const shippingAddressFromData = sanitizeAddress(data.shippingAddress)

    // Add user's phone number if not present in the address fields
    if (req.user?.mobileNumber) {
      if (billingAddressFromData && !billingAddressFromData.phone) {
        billingAddressFromData.phone = req.user.mobileNumber
      }
      if (shippingAddressFromData && !shippingAddressFromData.phone) {
        shippingAddressFromData.phone = req.user.mobileNumber
      }
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty or not provided.')
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('A valid amount is required to initiate payment.')
    }

    try {
      const flattenedCart = cart.items.map((item: any) => {
        const productID = typeof item.product === 'object' ? item.product.id : item.product
        const variantID = item.variant
          ? typeof item.variant === 'object'
            ? item.variant.id
            : item.variant
          : undefined

        const { product: _product, variant: _variant, ...customProperties } = item

        return {
          ...customProperties,
          product: productID,
          quantity: item.quantity,
          ...(variantID ? { variant: variantID } : {}),
        }
      })


      // Create transaction record in database
      const transaction = await payload.create({
        collection: transactionsSlug as any,
        data: {
          ...(req.user ? { customer: req.user.id } : { customerEmail }),
          amount,
          billingAddress: billingAddressFromData,
          shippingAddress: shippingAddressFromData,
          cart: cart.id,
          currency: currency.toUpperCase(),
          items: flattenedCart,
          paymentMethod: 'cod',
          status: 'pending',
        },
        req,
      })

      const returnData: InitiatePaymentReturnType = {
        amount,
        currency,
        transactionID: String(transaction.id),
        message: 'COD payment initiated successfully',
      }

      return returnData
    } catch (error) {
      payload.logger.error({ err: error, msg: 'Error initiating payment with COD' })
      throw new Error(error instanceof Error ? error.message : 'Unknown error initiating payment')
    }
  }

  const confirmOrder: ConfirmOrder = async ({
    cartsSlug = 'carts',
    data,
    ordersSlug = 'orders',
    req,
    transactionsSlug = 'transactions',
  }) => {
    const payload = req.payload
    const customerEmail = data.customerEmail
    const transactionID = data.transactionID as string

    if (!transactionID) {
      throw new Error('transactionID is required to confirm order.')
    }

    try {
      // Find matching transaction
      const transaction = await payload.findByID({
        collection: transactionsSlug as any,
        id: transactionID,
        overrideAccess: true,
        req,
      })

      if (!transaction) {
        throw new Error(`No transaction found for ID: ${transactionID}`)
      }

      if (transaction.paymentMethod !== 'cod') {
        throw new Error(`Transaction is not for COD: ${transactionID}`)
      }

      const cartID = transaction.cart
      const cartItemsSnapshot = transaction.items
      const shippingAddress = transaction.shippingAddress || data.shippingAddress || transaction.billingAddress

      if (!cartID) {
        throw new Error('Cart ID not found in the transaction record')
      }

      // Create final order
      const order = await payload.create({
        collection: ordersSlug as any,
        data: {
          amount: transaction.amount,
          currency: transaction.currency.toUpperCase(),
          ...(req.user ? { customer: req.user.id } : { customerEmail }),
          items: cartItemsSnapshot,
          shippingAddress: sanitizeAddress(shippingAddress),
          status: 'processing',
          transactions: [transaction.id],
        },
        overrideAccess: true,
        req,
      })

      const timestamp = new Date().toISOString()

      // Update cart as purchased and clear items
      await payload.update({
        id: typeof cartID === 'object' ? cartID.id : cartID,
        collection: cartsSlug as any,
        data: {
          purchasedAt: timestamp,
          items: [],
        },
        overrideAccess: true,
        req,
      })

      // Update transaction status to link the created order, but keep transaction status as pending
      await payload.update({
        id: transaction.id,
        collection: transactionsSlug as any,
        data: {
          order: order.id,
        },
        overrideAccess: true,
        req,
      })

      return {
        message: 'Order confirmed successfully via COD',
        orderID: order.id,
        transactionID: transaction.id,
        ...(order.accessToken ? { accessToken: order.accessToken } : {}),
      }
    } catch (error) {
      payload.logger.error({ err: error, msg: 'Error confirming order with COD' })
      throw new Error(error instanceof Error ? error.message : 'Unknown error confirming payment')
    }
  }

  return {
    name: 'cod',
    label,
    initiatePayment,
    confirmOrder,
    group: groupField,
  }
}
