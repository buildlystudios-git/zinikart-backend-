export const seedPaths = {
  '/next/seed': {
    post: {
      summary: 'Seed local database with template data',
      description: 'Destroys existing mock data and imports fresh collections (Users, Products, Categories, Banners, etc.). Requires Admin credentials.',
      tags: ['Admin Utilities'],
      security: [
        {
          CookieAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'Seeding completed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: true,
                  },
                },
              },
            },
          },
        },
        403: {
          description: 'Action forbidden (non-admin/unauthenticated)',
        },
        500: {
          description: 'Error seeding database',
        },
      },
    },
  },
}
