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
}
