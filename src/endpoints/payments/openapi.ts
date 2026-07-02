export const paymentPaths = {
  '/api/payments/stripe/initiate': {
    post: {
      summary: 'Initiate payment session via Stripe',
      description: 'Creates a Stripe PaymentIntent for the specified cart items. Returns the Stripe client secret needed on the frontend.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the cart to checkout',
                },
                billingAddress: {
                  type: 'object',
                  description: 'The billing address configuration',
                },
                shippingAddress: {
                  type: 'object',
                  description: 'The shipping address configuration',
                },
              },
              required: ['cartID', 'billingAddress', 'shippingAddress'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Payment session initiated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  clientSecret: {
                    type: 'string',
                    description: 'The client secret of the created Stripe PaymentIntent',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid payload or cart data' },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart not found' },
      },
    },
  },
  '/api/payments/stripe/confirm-order': {
    post: {
      summary: 'Confirm Stripe payment and create Order',
      description: 'Verifies the Stripe PaymentIntent state and creates a finalized Order in the database.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the checked out cart',
                },
                paymentIntentID: {
                  type: 'string',
                  description: 'The Stripe PaymentIntent ID to verify',
                },
                billingAddress: {
                  type: 'object',
                },
                shippingAddress: {
                  type: 'object',
                },
              },
              required: ['cartID', 'paymentIntentID', 'billingAddress', 'shippingAddress'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Order confirmed and created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderID: {
                    type: 'string',
                    description: 'The created Order document ID',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid or incomplete payment verification' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/payments/stripe/webhooks': {
    post: {
      summary: 'Stripe webhook listener',
      description: 'Handles server-to-server webhook callback events from Stripe (e.g. payment_intent.succeeded).',
      tags: ['payments'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: { description: 'Webhook processed' },
        400: { description: 'Invalid signature or event' },
      },
    },
  },
  '/api/payments/razorpay/initiate': {
    post: {
      summary: 'Initiate payment session via Razorpay',
      description: 'Creates a Razorpay Order and registers a pending transaction for checkout.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the cart to checkout',
                },
                billingAddress: {
                  type: 'object',
                },
                shippingAddress: {
                  type: 'object',
                },
              },
              required: ['cartID', 'billingAddress', 'shippingAddress'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Razorpay session initiated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  razorpayOrderID: {
                    type: 'string',
                    description: 'The created Razorpay Order ID (e.g. order_Pt3B89...)',
                  },
                  transactionID: {
                    type: 'string',
                    description: 'The internal pending Transaction ID',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid payload or empty cart' },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart not found' },
      },
    },
  },
  '/api/payments/razorpay/confirm-order': {
    post: {
      summary: 'Confirm Razorpay payment and create Order',
      description: 'Validates HMAC signature of the payment details and finalizes order creation.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the checked out cart',
                },
                razorpayOrderID: {
                  type: 'string',
                  description: 'The Razorpay Order ID',
                },
                razorpayPaymentID: {
                  type: 'string',
                  description: 'The Razorpay Payment ID returned from SDK checkout popup',
                },
                razorpaySignature: {
                  type: 'string',
                  description: 'HMAC signature to verify payment authenticity',
                },
                billingAddress: {
                  type: 'object',
                },
                shippingAddress: {
                  type: 'object',
                },
              },
              required: [
                'cartID',
                'razorpayOrderID',
                'razorpayPaymentID',
                'razorpaySignature',
                'billingAddress',
                'shippingAddress',
              ],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Razorpay payment verified and Order created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderID: {
                    type: 'string',
                    description: 'The created internal Order document ID',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid signature or checkout validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/payments/razorpay/webhooks': {
    post: {
      summary: 'Razorpay webhook listener',
      description: 'Handles callback notification webhooks from Razorpay (e.g. order.paid, payment.captured).',
      tags: ['payments'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: { description: 'Webhook processed' },
        400: { description: 'Invalid signature or payload' },
      },
    },
  },
  '/api/payments/cod/initiate': {
    post: {
      summary: 'Initiate payment session via COD',
      description: 'Creates a pending Cash on Delivery transaction for checkout.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the cart to checkout',
                },
                billingAddress: {
                  type: 'object',
                },
                shippingAddress: {
                  type: 'object',
                },
              },
              required: ['cartID', 'billingAddress', 'shippingAddress'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'COD transaction initiated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transactionID: {
                    type: 'string',
                    description: 'The internal pending Transaction ID',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid payload or empty cart' },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart not found' },
      },
    },
  },
  '/api/payments/cod/confirm-order': {
    post: {
      summary: 'Confirm COD payment and create Order',
      description: 'Places the final order for Cash on Delivery checkout and clears the cart.',
      tags: ['payments'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                cartID: {
                  type: 'string',
                  description: 'The ID of the checked out cart',
                },
                transactionID: {
                  type: 'string',
                  description: 'The internal pending Transaction ID',
                },
                billingAddress: {
                  type: 'object',
                },
                shippingAddress: {
                  type: 'object',
                },
              },
              required: ['cartID', 'transactionID', 'billingAddress', 'shippingAddress'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'COD order created successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderID: {
                    type: 'string',
                    description: 'The created internal Order document ID',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid transaction or validation error' },
        401: { description: 'Unauthorized' },
      },
    },
  },
}
