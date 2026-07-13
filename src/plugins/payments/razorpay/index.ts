import type { Endpoint, Field, GroupField, PayloadRequest } from 'payload'
import crypto from 'crypto'
import type { PaymentAdapter } from '@payloadcms/plugin-ecommerce/types'

type InitiatePayment = PaymentAdapter['initiatePayment']
type ConfirmOrder = PaymentAdapter['confirmOrder']

export type RazorpayAdapterArgs = {
  keyId: string
  keySecret: string
  webhookSecret?: string
  label?: string
}

type InitiatePaymentReturnType = {
  razorpayOrderID: string
  amount: number
  currency: string
  key: string
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

export const razorpayAdapter = (props: RazorpayAdapterArgs): PaymentAdapter => {
  const { keyId, keySecret, webhookSecret } = props
  const label = props?.label || 'Razorpay'

  const baseFields: Field[] = [
    {
      name: 'orderID',
      type: 'text',
      label: 'Razorpay Order ID',
    },
    {
      name: 'paymentID',
      type: 'text',
      label: 'Razorpay Payment ID',
    },
    {
      name: 'signature',
      type: 'text',
      label: 'Razorpay Signature',
    },
    {
      name: 'refundID',
      type: 'text',
      label: 'Razorpay Refund ID',
    },
    {
      name: 'refundStatus',
      type: 'select',
      label: 'Refund Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processed', value: 'processed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'refundedAmount',
      type: 'number',
      label: 'Refunded Amount',
    },
    {
      name: 'refundedAt',
      type: 'date',
      label: 'Refunded At',
    },
  ]

  const groupField: GroupField = {
    name: 'razorpay',
    type: 'group',
    admin: {
      condition: (data) => {
        return data?.paymentMethod === 'razorpay'
      },
    },
    fields: baseFields,
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

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials keyId and keySecret are required.')
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty or not provided.')
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('A valid amount is required to initiate payment.')
    }

    try {
      const flattenedCart = cart.items.map((item) => {
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

      let razorpayOrder: { id: string; amount: number; currency: string }

      if (keyId.startsWith('rzp_test_mock')) {
        razorpayOrder = {
          id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
          amount,
          currency: currency.toUpperCase(),
        }
      } else {
        // Create Order on Razorpay via direct API fetch
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount, // already in Paise (due to decimals: 2)
            currency: currency.toUpperCase(),
            receipt: String(cart.id),
          }),
        })

        if (!razorpayResponse.ok) {
          const errText = await razorpayResponse.text()
          throw new Error(`Razorpay Order creation failed: ${errText}`)
        }

        razorpayOrder = (await razorpayResponse.json()) as { id: string; amount: number; currency: string }
      }

      // Create transaction record in database
      const transaction = await payload.create({
        collection: transactionsSlug as any,
        data: {
          ...(req.user ? { customer: req.user.id } : { customerEmail }),
          amount: razorpayOrder.amount,
          billingAddress: billingAddressFromData,
          shippingAddress: shippingAddressFromData,
          cart: cart.id,
          currency: razorpayOrder.currency.toUpperCase(),
          items: flattenedCart,
          paymentMethod: 'razorpay',
          paymentMethodDetails: {
            paymentMethod: 'razorpay',
          },
          status: 'pending',
          razorpay: {
            orderID: razorpayOrder.id,
          },
        },
        overrideAccess: true,
      })

      const returnData: InitiatePaymentReturnType = {
        razorpayOrderID: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: keyId,
        transactionID: String(transaction.id),
        message: 'Razorpay payment initiated successfully',
      }

      return returnData
    } catch (error) {
      payload.logger.error({ err: error, msg: 'Error initiating payment with Razorpay' })
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
    const razorpayOrderID = data.razorpayOrderID as string
    const razorpayPaymentID = data.razorpayPaymentID as string
    const razorpaySignature = data.razorpaySignature as string

    if (!razorpayOrderID || !razorpayPaymentID || !razorpaySignature) {
      throw new Error('razorpayOrderID, razorpayPaymentID, and razorpaySignature are required to confirm order.')
    }

    // Verify signature
    const textToHash = `${razorpayOrderID}|${razorpayPaymentID}`
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(textToHash)
      .digest('hex')

    if (generatedSignature !== razorpaySignature) {
      throw new Error('Razorpay signature verification failed. Possible fraud attempt.')
    }

    try {
      // Find matching transaction
      const transactionsResults = await payload.find({
        collection: transactionsSlug as any,
        depth: 0,
        overrideAccess: true,
        where: {
          'razorpay.orderID': {
            equals: razorpayOrderID,
          },
        },
      })

      const transaction = transactionsResults.docs[0]

      if (!transactionsResults.totalDocs || !transaction) {
        throw new Error(`No transaction found for Razorpay Order ID: ${razorpayOrderID}`)
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
          status: 'placed',
          transactions: [transaction.id],
        },
        overrideAccess: true,
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
      })

      // Update transaction status
      await payload.update({
        id: transaction.id,
        collection: transactionsSlug as any,
        data: {
          order: order.id,
          status: 'succeeded',
          razorpay: {
            orderID: razorpayOrderID,
            paymentID: razorpayPaymentID,
            signature: razorpaySignature,
          },
        },
        overrideAccess: true,
      })

      return {
        message: 'Order confirmed successfully via Razorpay',
        orderID: order.id,
        transactionID: transaction.id,
        ...(order.accessToken ? { accessToken: order.accessToken } : {}),
      }
    } catch (error: any) {
      console.error("DEBUG: confirmOrder payload.create error!", error.message)
      if (error.data) {
         console.error("DEBUG validation errors:", JSON.stringify(error.data, null, 2))
      }
      payload.logger.error({ err: error, msg: 'Error confirming order with Razorpay' })
      throw new Error(error instanceof Error ? error.message : 'Unknown error confirming payment')
    }
  }

  const webhooksEndpoint: Endpoint = {
    path: '/webhooks',
    method: 'post',
    handler: async (req) => {
      let returnStatus = 200

      if (webhookSecret && req.text) {
        const body = await req.text()
        const razorpaySignature = req.headers.get('x-razorpay-signature')

        if (razorpaySignature) {
          const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex')

          if (expectedSignature !== razorpaySignature) {
            req.payload.logger.error('Invalid Razorpay webhook signature')
            returnStatus = 400
          } else {
            // Process webhook events if needed in the future
            // E.g. order.paid, payment.failed
            const parsedBody = JSON.parse(body)
            req.payload.logger.info(`Received Razorpay webhook event: ${parsedBody.event}`)
          }
        }
      }

      return Response.json({ received: true }, { status: returnStatus })
    },
  }

  return {
    name: 'razorpay',
    label,
    initiatePayment,
    confirmOrder,
    endpoints: [webhooksEndpoint],
    group: groupField,
  }
}
