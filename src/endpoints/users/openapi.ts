export const usersAuthPaths = {
  '/api/users/me': {
    get: {
      summary: 'Get current user session status',
      description: 'Returns the currently authenticated user profile data, token, and session expiration details.',
      tags: ['Users'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'Current session status retrieved successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    nullable: true,
                    description: 'The authenticated user object',
                  },
                  token: {
                    type: 'string',
                    nullable: true,
                    description: 'The active JWT session token',
                  },
                  exp: {
                    type: 'number',
                    nullable: true,
                    description: 'Unix timestamp when the token expires',
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/users/login': {
    post: {
      summary: 'Login User',
      description: 'Authenticates a user via email and password, returning a JWT token and setting a session cookie.',
      tags: ['Users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'admin@zinikart.com',
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'password',
                },
              },
              required: ['email', 'password'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful. Returns user profile and session token.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                  },
                  token: {
                    type: 'string',
                  },
                  exp: {
                    type: 'number',
                  },
                },
              },
            },
          },
        },
        400: { description: 'Invalid login credentials' },
      },
    },
  },
  '/api/users/logout': {
    post: {
      summary: 'Logout User',
      description: 'Clears the authentication session and expires the cookie.',
      tags: ['Users'],
      responses: {
        200: {
          description: 'Logged out successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Logged out successfully.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/users/fcm-token': {
    post: {
      summary: 'Register FCM Token',
      description: 'Registers a Firebase Cloud Messaging token for the authenticated user to receive push notifications.',
      tags: ['Users'],
      security: [{ CookieAuth: [] }, { BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'fcm_token_12345' },
                platform: { type: 'string', enum: ['android', 'ios', 'web'], example: 'android' },
                deviceLabel: { type: 'string', example: 'My Android Phone' },
              },
              required: ['token', 'platform'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Token registered successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Token registered successfully' },
                },
              },
            },
          },
        },
        400: { description: 'Bad Request - Missing token or platform' },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal Server Error' },
      },
    },
    delete: {
      summary: 'Unregister FCM Token',
      description: 'Unregisters a Firebase Cloud Messaging token from the authenticated user.',
      tags: ['Users'],
      security: [{ CookieAuth: [] }, { BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'fcm_token_12345' },
              },
              required: ['token'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Token unregistered successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Token unregistered successfully' },
                },
              },
            },
          },
        },
        400: { description: 'Bad Request - Missing token' },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal Server Error' },
      },
    },
  },
}
