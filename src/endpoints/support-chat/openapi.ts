export const supportChatPaths = {
  '/api/support-chats/{id}/rate': {
    post: {
      summary: 'Rate a support chat',
      description: 'Submit a 1-5 rating and optional comment for a support chat.',
      tags: ['Support Chats'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          description: 'ID of the support chat',
          required: true,
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
                score: {
                  type: 'number',
                  minimum: 1,
                  maximum: 5,
                },
                comment: {
                  type: 'string',
                },
              },
              required: ['score'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Successfully rated',
        },
        '400': {
          description: 'Bad request',
        },
        '401': {
          description: 'Unauthorized',
        },
        '403': {
          description: 'Forbidden',
        },
        '404': {
          description: 'Not found',
        },
      },
    },
  },
  '/api/support-chats/presence': {
    get: {
      summary: 'Get chat presence',
      description: 'Check online status of given users. Admin only.',
      tags: ['Support Chats'],
      parameters: [
        {
          name: 'userIds[]',
          in: 'query',
          description: 'Array of user IDs to check',
          required: true,
          schema: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      ],
      responses: {
        '200': {
          description: 'Successfully retrieved presence',
        },
        '400': {
          description: 'Bad request',
        },
        '403': {
          description: 'Forbidden',
        },
      },
    },
  },
}
