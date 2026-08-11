export const mobileCatalogPaths = {
  '/api/mobile/products': {
    get: {
      summary: 'List products for mobile catalog',
      description: 'Fetch a paginated list of products with optional filtering and sorting.',
      tags: ['products'],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'brand', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc', 'newest', 'rating'] } },
        { name: 'isMasterTemplate', in: 'query', schema: { type: 'boolean' }, description: 'Set to true to fetch master templates instead of regular products' },
      ],
      responses: {
        200: {
          description: 'Successful product list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  docs: { type: 'array', items: { type: 'object' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      totalDocs: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      hasNextPage: { type: 'boolean' },
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
  '/api/mobile/products/{id}': {
    get: {
      summary: 'Get product details for customer',
      description: 'Fetch detailed specifications of a retailer product listing along with active retailer profile and alternative competitor offers for the same product model.',
      tags: ['products'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the retailer-listed product (must be isMasterTemplate: false)',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        200: {
          description: 'Successful product details resolution',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'The flat product object details',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  retailer: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      shopName: { type: 'string' },
                      city: { type: 'string' },
                      landmark: { type: 'string', nullable: true },
                      businessHours: {
                        type: 'object',
                        properties: {
                          startTime: { type: 'string' },
                          endTime: { type: 'string' },
                          openEveryday: { type: 'boolean' },
                        },
                      },
                      averageRating: { type: 'number' },
                      ratingCount: { type: 'number' },
                    },
                  },
                  otherOffers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string' },
                        price: { type: 'number' },
                        discountedPrice: { type: 'number', nullable: true },
                        shopName: { type: 'string' },
                        city: { type: 'string' },
                        averageRating: { type: 'number' },
                        ratingCount: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Invalid product ID supplied',
        },
        404: {
          description: 'Product not found or represents a master catalog template',
        },
      },
    },
  },
}


