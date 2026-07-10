export const orderPaths = {
  '/api/orders/{id}/retailer-action': {
    post: {
      summary: 'Perform retailer action on placed order (Accept/Reject)',
      description: 'Allows an authenticated retailer to either accept a placed order (transitioning it to order_received and starting delivery partner assignment) or reject/cancel it.',
      tags: ['orders'],
      security: [
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The ID of the order to act upon',
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['accept', 'reject'],
                  description: 'The action to perform',
                },
                reason: {
                  type: 'string',
                  description: 'cancellation details or rejection reason if action is reject',
                },
              },
              required: ['action'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Action successfully processed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid action or order is no longer in placed status' },
        401: { description: 'Unauthorized' },
        403: { description: 'Access denied: not a retailer or not the owner of this order' },
        404: { description: 'Order not found' },
      },
    },
  },
  '/api/orders/{id}/delivery-action': {
    post: {
      summary: 'Perform delivery partner action on offered order (Accept/Reject)',
      description: 'Allows an offered delivery partner to either accept the delivery offer or reject it (transitioning the offer to the next partner). Uses atomic updates to avoid double-acceptance race conditions.',
      tags: ['orders'],
      security: [
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The ID of the order to act upon',
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['accept', 'reject'],
                  description: 'The action to perform',
                },
              },
              required: ['action'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Action successfully processed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        400: { description: 'Action is required or invalid action' },
        401: { description: 'Unauthorized' },
        403: { description: 'Access denied: not a delivery partner or offer was not assigned to this partner' },
        404: { description: 'Order not found or no offer active' },
        409: { description: 'Offer expired or already assigned' },
      },
    },
  },
  '/api/orders/{id}/status-update': {
    post: {
      summary: 'Transition order status with verification OTPs',
      description: 'Updates the order state. If transitioning to picked_up or delivered, requires verification of the corresponding pickup/delivery OTP.',
      tags: ['orders'],
      security: [
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The ID of the order to update',
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  description: 'The target order status to transition to',
                },
                pickupOTP: {
                  type: 'string',
                  description: 'Required if transitioning to picked_up status',
                },
                deliveryOTP: {
                  type: 'string',
                  description: 'Required if transitioning to delivered status',
                },
              },
              required: ['status'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Order status updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid status transition, missing/invalid OTP, or payment validation failure' },
        401: { description: 'Unauthorized' },
        404: { description: 'Order not found' },
      },
    },
  },
}
