export const payoutPaths = {
  '/mobile/payouts/my-ledger': {
    get: {
      tags: ['Payouts'],
      summary: 'Get My Payout Ledger',
      description: 'Returns paginated payout ledger entries for the authenticated user.',
      security: [{ ApiKey: [] }, { BearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 10 },
          description: 'Items per page',
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by status (e.g., pending, eligible, paid)',
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      docs: { type: 'array', items: { type: 'object' } },
                      totalDocs: { type: 'integer' },
                      limit: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      page: { type: 'integer' },
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/mobile/payouts/my-invoices': {
    get: {
      tags: ['Payouts'],
      summary: 'Get My Payout Invoices',
      description: 'Returns paginated payout invoices for the authenticated user.',
      security: [{ ApiKey: [] }, { BearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 10 },
          description: 'Items per page',
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      docs: { type: 'array', items: { type: 'object' } },
                      totalDocs: { type: 'integer' },
                      limit: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      page: { type: 'integer' },
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/mobile/payouts/invoices/{id}': {
    get: {
      tags: ['Payouts'],
      summary: 'Get Invoice Detail',
      description: 'Returns a single payout invoice with line items.',
      security: [{ ApiKey: [] }, { BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Invoice ID',
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  }
}
