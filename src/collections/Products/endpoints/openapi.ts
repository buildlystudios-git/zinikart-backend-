export const productsPaths = {
  '/api/products/custom-create': {
    post: {
      summary: 'Create or update a product with optional variants',
      description: `
A unified endpoint that handles both **product creation** and **product update** in a single call.

**Create mode** (omit \`id\`): Creates a new product and optionally creates linked variants in one atomic-ish operation.

**Update mode** (pass \`id\`): Updates an existing product and upserts any variants provided (variant \`id\` present → update, variant \`id\` absent → create).

The \`setTemplateFields\` before-change hook will automatically populate empty inherited fields from the \`parentTemplate\` if one is supplied.
      `.trim(),
      tags: ['products'],
      security: [
        { CookieAuth: [] },
        { BearerAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description:
                    'The ID of an existing product to **update**. Omit this field to **create** a new product.',
                  example: '683a2f1e4b2c3d0012345678',
                },
                title: {
                  type: 'string',
                  description:
                    'Product title (required when creating; optional when updating).',
                  example: 'Premium Wireless Headphones',
                },
                parentTemplate: {
                  type: 'string',
                  nullable: true,
                  description:
                    'ID of the master catalog template to inherit fields from.',
                  example: '683a2f1e4b2c3d0087654321',
                },
                priceInINR: {
                  type: 'number',
                  description:
                    'Product price in INR — only used when **no variants** are supplied.',
                  example: 4999,
                },
                inventory: {
                  type: 'integer',
                  description:
                    'Product inventory count — only used when **no variants** are supplied.',
                  example: 100,
                },
                categories: {
                  type: 'array',
                  description: 'Array of category IDs to assign to this product.',
                  items: { type: 'string' },
                  example: ['cat_electronics', 'cat_audio'],
                },
                brand: {
                  type: 'string',
                  description: 'ID of the Brand relationship.',
                  example: 'brand_sony',
                },
                discountPercent: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description:
                    'Discount percentage. The `discountedPrice` field is auto-calculated by the `calculateDiscountedPrice` hook.',
                  example: 10,
                },
                warranty: {
                  type: 'string',
                  description: 'Human-readable warranty details.',
                  example: '1 Year Manufacturer Warranty',
                },
                specifications: {
                  type: 'array',
                  description: 'Array of key/value specification entries.',
                  items: {
                    type: 'object',
                    required: ['key', 'value', 'type'],
                    properties: {
                      key: { type: 'string', example: 'Battery Life' },
                      value: { type: 'string', example: '30 hours' },
                      type: {
                        type: 'string',
                        enum: ['text', 'number', 'select', 'date'],
                        example: 'text',
                      },
                    },
                  },
                },
                variants: {
                  type: 'array',
                  description:
                    'Array of variant objects. When present, `priceInINR` and `inventory` at the top level are **ignored** — set them per variant instead. `enableVariants` is set to `true` automatically.',
                  items: {
                    type: 'object',
                    required: ['options', 'priceInINR', 'inventory'],
                    properties: {
                      id: {
                        type: 'string',
                        description:
                          'Existing variant ID — if provided the variant is **updated**, otherwise a new variant is **created**.',
                        example: '683a2f1e4b2c3d0099887766',
                      },
                      options: {
                        type: 'array',
                        description: 'Array of variant-option IDs (e.g. "Red", "XL").',
                        items: { type: 'string' },
                        example: ['opt_red', 'opt_xl'],
                      },
                      priceInINR: {
                        type: 'number',
                        description: 'Price for this specific variant in INR.',
                        example: 5499,
                      },
                      inventory: {
                        type: 'integer',
                        description: 'Stock count for this specific variant.',
                        example: 20,
                      },
                    },
                  },
                },
              },
            },
            examples: {
              create_simple: {
                summary: 'Create a simple product (no variants)',
                value: {
                  title: 'Premium Wireless Headphones',
                  priceInINR: 4999,
                  inventory: 100,
                  brand: 'brand_sony',
                  discountPercent: 10,
                  warranty: '1 Year Manufacturer Warranty',
                  specifications: [
                    { key: 'Battery Life', value: '30 hours', type: 'text' },
                    { key: 'Weight', value: '250g', type: 'text' },
                  ],
                },
              },
              create_with_variants: {
                summary: 'Create a product with variants',
                value: {
                  title: 'Classic T-Shirt',
                  parentTemplate: '683a2f1e4b2c3d0087654321',
                  variants: [
                    { options: ['opt_red', 'opt_small'], priceInINR: 799, inventory: 50 },
                    { options: ['opt_red', 'opt_large'], priceInINR: 849, inventory: 30 },
                    { options: ['opt_blue', 'opt_small'], priceInINR: 799, inventory: 40 },
                  ],
                },
              },
              update_product: {
                summary: 'Update an existing product',
                value: {
                  id: '683a2f1e4b2c3d0012345678',
                  title: 'Premium Wireless Headphones V2',
                  priceInINR: 5499,
                  inventory: 80,
                  discountPercent: 15,
                },
              },
              update_upsert_variants: {
                summary: 'Update product and upsert variants (mix of update + create)',
                value: {
                  id: '683a2f1e4b2c3d0012345678',
                  variants: [
                    {
                      id: '683a2f1e4b2c3d0099887766',
                      options: ['opt_red', 'opt_small'],
                      priceInINR: 850,
                      inventory: 45,
                    },
                    {
                      options: ['opt_green', 'opt_medium'],
                      priceInINR: 900,
                      inventory: 25,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Product created or updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Product created successfully',
                  },
                  product: {
                    type: 'object',
                    description: 'The full saved product document.',
                  },
                  variants: {
                    type: 'array',
                    description: 'Array of saved variant documents (empty if no variants were supplied).',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error — `title` is missing when creating a new product.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Missing required field: title for creation' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized — request must be made by an authenticated user.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Unauthorized' },
                },
              },
            },
          },
        },
        500: {
          description: 'Internal server error.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
}
