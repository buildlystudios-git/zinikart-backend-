export const mobileOtpAuthPaths = {
  '/api/mobile/auth/otp/request': {
    post: {
      summary: 'Request mobile OTP',
      tags: ['Users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                mobileNumber: {
                  type: 'string',
                  description: 'Primary mobile number in E.164 format',
                  example: '+919999999999',
                },
              },
              required: ['mobileNumber'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'OTP sent successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  mobileNumber: { type: 'string' },
                  test: { type: 'boolean' },
                  reqId: {
                    type: 'string',
                    nullable: true,
                    description: 'MSG91 request ID required for subsequent verify/retry calls in Widget flow',
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Error processing request',
        },
      },
    },
  },
  '/api/mobile/auth/otp/verify': {
    post: {
      summary: 'Verify mobile OTP and login',
      tags: ['Users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  description: 'Access token received from MSG91 OTP Widget (alternative to mobileNumber+code)',
                },
                mobileNumber: {
                  type: 'string',
                  example: '+919999999999',
                },
                code: {
                  type: 'string',
                  description: 'OTP code sent via SMS',
                  example: '111111',
                },
                name: {
                  type: 'string',
                  description: 'Optional display name',
                  example: 'John Doe',
                },
                role: {
                  type: 'string',
                  enum: ['customer', 'retailer', 'delivery_partner'],
                  description: 'Requested login role context',
                  example: 'customer',
                },
              },
              // Note: either (mobileNumber + code) OR (accessToken) is required.
              // The Widget flow only needs accessToken; standard flow needs mobileNumber + code.
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login evaluation completed. Returns user profile, status, and optional session token.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  status: {
                    type: 'string',
                    enum: ['approved', 'approved_no_products', 'registration_required', 'pending_approval', 'rejected', 'suspended'],
                  },
                  exists: { type: 'boolean' },
                  token: { type: 'string', nullable: true },
                  exp: { type: 'number', nullable: true },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string', nullable: true },
                      mobileNumber: { type: 'string' },
                      mobileVerified: { type: 'boolean' },
                      name: { type: 'string', nullable: true },
                      roles: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      cartId: {
                        type: 'string',
                        nullable: true,
                        description: 'Cart ID for customer role; null for retailer/delivery_partner',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: 'Invalid OTP code',
        },
        403: {
          description: 'Account not registered for the requested role',
        },
      },
    },
  },
  '/api/mobile/auth/me': {
    get: {
      summary: 'Get current mobile user',
      tags: ['Users'],
      security: [{ CookieAuth: [] }, { BearerAuth: [] }],
      responses: {
        200: {
          description: 'Current authenticated user profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string', nullable: true },
                      mobileNumber: { type: 'string' },
                      mobileVerified: { type: 'boolean' },
                      name: { type: 'string', nullable: true },
                      roles: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      cartId: {
                        type: 'string',
                        nullable: true,
                        description: 'Cart ID for customer role; null for retailer/delivery_partner',
                      },
                    },
                  },
                  status: {
                    type: 'string',
                    enum: ['approved', 'approved_no_products', 'registration_required', 'pending_approval', 'rejected', 'suspended'],
                  },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized access token',
        },
      },
    },
  },
}
