export const retailerAnalyticsPaths = {
  '/api/retailers/analytics': {
    get: {
      summary: 'Get retailer sales, inventory, and performance analytics',
      description: 'Fetch detailed sales performance, payouts/earnings, inventory stock details, top selling products, brands, categories, and historical performance charts for the logged-in retailer or system-wide (for admins).',
      tags: ['Retailers'],
      security: [
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'date',
          in: 'query',
          required: false,
          description: 'A single date (YYYY-MM-DD) to query analytics for a specific day. Defaults to today if no date params are provided.',
          schema: {
            type: 'string',
            format: 'date',
          },
        },
        {
          name: 'startDate',
          in: 'query',
          required: false,
          description: 'Start date (YYYY-MM-DD) for querying a range of days (must be provided with endDate).',
          schema: {
            type: 'string',
            format: 'date',
          },
        },
        {
          name: 'endDate',
          in: 'query',
          required: false,
          description: 'End date (YYYY-MM-DD) for querying a range of days (must be provided with startDate).',
          schema: {
            type: 'string',
            format: 'date',
          },
        },
        {
          name: 'retailer',
          in: 'query',
          required: false,
          description: 'A specific retailer user ID to query analytics for. Only accessible by admins (retailers are scoped to their own ID).',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        200: {
          description: 'Analytics summary data successfully fetched',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  range: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' },
                    },
                  },
                  summary: {
                    type: 'object',
                    properties: {
                      grossSalesInINR: { type: 'number' },
                      platformCommissionInINR: { type: 'number' },
                      netEarningsInINR: { type: 'number' },
                      ordersCount: { type: 'number' },
                      productsSoldCount: { type: 'number' },
                      averageOrderValueInINR: { type: 'number' },
                    },
                  },
                  inventory: {
                    type: 'object',
                    properties: {
                      totalProducts: { type: 'number' },
                      totalStock: { type: 'number' },
                      lowStockCount: { type: 'number' },
                      outOfStockCount: { type: 'number' },
                    },
                  },
                  topSellingProducts: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  topCategories: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  topBrands: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  historicalData: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Invalid input parameters or date range',
        },
        401: {
          description: 'Authentication token missing or invalid',
        },
        403: {
          description: 'Access denied (neither retailer nor admin)',
        },
      },
    },
  },
}
