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
  '/api/users/refresh-token': {
    post: {
      summary: 'Refresh Auth Token',
      description: `Exchanges the current session cookie for a fresh JWT token.
The browser automatically sends the \`HttpOnly\` session cookie, so no Authorization header is required.
The returned \`token\` is a plain-text JWT that can be read by JavaScript — useful for authenticating
cross-subdomain WebSocket connections (e.g. passing it as \`?token=<jwt>\` in the WS URL).`,
      tags: ['Users'],
      security: [
        {
          CookieAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'Token refreshed successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string',
                    description: 'A fresh JWT token readable by JavaScript. Use this for WebSocket authentication.',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  },
                  exp: {
                    type: 'number',
                    description: 'Unix timestamp when the new token expires.',
                    example: 1723900800,
                  },
                  user: {
                    type: 'object',
                    description: 'The authenticated user profile.',
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized — no valid session cookie present.' },
      },
    },
  },
}
