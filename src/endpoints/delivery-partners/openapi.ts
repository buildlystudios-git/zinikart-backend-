export const deliveryPartnerPaths = {
  '/api/delivery-partners/location': {
    patch: {
      summary: 'Update delivery partner GPS location coordinates',
      description: 'Allows an authenticated delivery partner to update their current latitude and longitude coordinates. GPS updates are rate-limited/throttled on the server side.',
      tags: ['Delivery Partners'],
      security: [
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
                lat: {
                  type: 'number',
                  description: 'Current latitude coordinate value',
                },
                lng: {
                  type: 'number',
                  description: 'Current longitude coordinate value',
                },
              },
              required: ['lat', 'lng'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Location coordinates successfully updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        400: { description: 'Latitude and Longitude are required or invalid coordinates' },
        401: { description: 'Unauthorized' },
        403: { description: 'Access denied: not a delivery partner user profile' },
        429: { description: 'Too frequent location updates (throttled)' },
      },
    },
  },
}
