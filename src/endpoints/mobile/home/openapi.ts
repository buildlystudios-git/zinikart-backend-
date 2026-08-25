export const mobileHomePaths = {
  '/api/mobile/home': {
    get: {
      summary: 'Home Feed (BFF Aggregator)',
      description: `Single-call home page feed. Runs all section queries in parallel server-side and returns one
bundled response for the mobile app home screen. Eliminates multiple round-trips.

**Sections returned:**
- \`categories\` — full category list with icons (Shop by Category strip)
- \`brands\` — top brands with logos (Brands banner)
- \`topSelling\` — highest-rated published retailer products
- \`quickPicks\` — cheapest products under \`maxPrice\` (default ₹999)
- \`nearbyStores\` — approved retailers within \`radius\` km, sorted by distance
- \`featuredSections\` — one horizontal section per category ID passed via \`featuredCategoryIds\`
- \`byCategorySections\` — one grid section per category ID passed via \`byCategoryIds\`

All product payloads use the full **detail transformer** (includes description and variants).`,
      tags: ['Mobile (Home)'],
      parameters: [
        {
          name: 'sectionLimit',
          in: 'query',
          description: 'Max products per section (topSelling, quickPicks, featured, byCategory). Max 30.',
          schema: { type: 'integer', default: 10, maximum: 30 },
        },
        {
          name: 'maxPrice',
          in: 'query',
          description: 'Upper price limit (₹) for the Quick Picks section.',
          schema: { type: 'integer', default: 999 },
        },
        {
          name: 'featuredCategoryIds',
          in: 'query',
          description: 'Comma-separated category IDs to show as horizontal "Featured" carousels (e.g. cat1,cat2).',
          schema: { type: 'string' },
        },
        {
          name: 'byCategoryIds',
          in: 'query',
          description: 'Comma-separated category IDs to show as grid "By Category" sections (e.g. cat3,cat4).',
          schema: { type: 'string' },
        },
        {
          name: 'lat',
          in: 'query',
          description: "User's current latitude for nearby stores. Required together with lng.",
          schema: { type: 'number' },
        },
        {
          name: 'lng',
          in: 'query',
          description: "User's current longitude for nearby stores. Required together with lat.",
          schema: { type: 'number' },
        },
        {
          name: 'radius',
          in: 'query',
          description: 'Search radius in km for nearby stores. Default is 5 km.',
          schema: { type: 'number', default: 5 },
        },
        {
          name: 'nearbyLimit',
          in: 'query',
          description: 'Max number of nearby stores to return.',
          schema: { type: 'integer', default: 6 },
        },
        {
          name: 'brandsLimit',
          in: 'query',
          description: 'Max number of brands to return for the banner section. Max 50.',
          schema: { type: 'integer', default: 12, maximum: 50 },
        },
      ],
      responses: {
        200: {
          description: 'Aggregated home feed successfully returned.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'array',
                    description: 'All categories with id, title, slug, imageUrl.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        slug: { type: 'string', nullable: true },
                        imageUrl: { type: 'string', nullable: true },
                      },
                    },
                  },
                  brands: {
                    type: 'array',
                    description: 'Top brands with id, name, logoUrl.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        logoUrl: { type: 'string', nullable: true },
                      },
                    },
                  },
                  topSelling: {
                    type: 'array',
                    description: 'Highest-rated products (full detail shape).',
                    items: { type: 'object' },
                  },
                  quickPicks: {
                    type: 'object',
                    properties: {
                      maxPrice: { type: 'integer', description: 'Price ceiling used for this section.' },
                      products: {
                        type: 'array',
                        description: 'Cheapest products under maxPrice (full detail shape).',
                        items: { type: 'object' },
                      },
                    },
                  },
                  nearbyStores: {
                    type: 'array',
                    description: 'Approved retailer stores within the requested radius, sorted by distance.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        shopName: { type: 'string' },
                        ownerName: { type: 'string' },
                        images: { type: 'array', items: { type: 'string' } },
                        shopAddress: { type: 'object' },
                        businessHours: { type: 'object' },
                        averageRating: { type: 'number' },
                        ratingCount: { type: 'number' },
                        distanceKm: {
                          type: 'number',
                          nullable: true,
                          description: 'Present only when lat & lng were provided.',
                        },
                      },
                    },
                  },
                  featuredSections: {
                    type: 'array',
                    description: 'One section per featuredCategoryId. Each section is a horizontal product carousel.',
                    items: {
                      type: 'object',
                      properties: {
                        categoryId: { type: 'string' },
                        title: { type: 'string' },
                        products: { type: 'array', items: { type: 'object' } },
                      },
                    },
                  },
                  byCategorySections: {
                    type: 'array',
                    description: 'One section per byCategoryId. Each section is a product grid.',
                    items: {
                      type: 'object',
                      properties: {
                        categoryId: { type: 'string' },
                        title: { type: 'string' },
                        products: { type: 'array', items: { type: 'object' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        500: {
          description: 'Internal server error.',
        },
      },
    },
  },
}
