export const cartPaths = {
  '/api/carts/{id}/add-item': {
    post: {
      summary: 'Add an item to the cart',
      description: 'Adds a product or product variant line item to the specified cart. Runs validation and updates totals.',
      tags: ['carts'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the Cart',
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
                item: {
                  type: 'object',
                  description: 'Object defining the item (e.g., product ID, variant ID)',
                  properties: {
                    product: {
                      type: 'string',
                      description: 'The ID of the product to add',
                    },
                    variant: {
                      type: 'string',
                      description: 'Optional ID of the product variant',
                    },
                  },
                  required: ['product'],
                },
                quantity: {
                  type: 'integer',
                  description: 'The quantity to add',
                  default: 1,
                },
              },
              required: ['item'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Product added successfully. Returns the updated cart object.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  doc: { type: 'object', description: 'The updated cart document' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid payload or product out of stock' },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart or product not found' },
      },
    },
  },
  '/api/carts/{id}/update-item': {
    post: {
      summary: 'Update cart item quantity',
      description: 'Updates the quantity of a specific line item in the cart. Supports absolute values or increment operations.',
      tags: ['carts'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the Cart',
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
                itemID: {
                  type: 'string',
                  description: 'The unique ID of the line item within the cart',
                },
                quantity: {
                  oneOf: [
                    {
                      type: 'integer',
                      description: 'The absolute quantity to set',
                    },
                    {
                      type: 'object',
                      properties: {
                        $inc: {
                          type: 'integer',
                          description: 'Value to increment (e.g. 1) or decrement (e.g. -1)',
                        },
                      },
                    },
                  ],
                },
              },
              required: ['itemID', 'quantity'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Cart item updated successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  doc: { type: 'object', description: 'The updated cart document' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid request parameters' },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart or line item not found' },
      },
    },
  },
  '/api/carts/{id}/remove-item': {
    post: {
      summary: 'Remove an item from the cart',
      description: 'Removes a specific line item from the cart and updates totals.',
      tags: ['carts'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the Cart',
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
                itemID: {
                  type: 'string',
                  description: 'The unique ID of the line item to remove',
                },
              },
              required: ['itemID'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Item removed successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  doc: { type: 'object', description: 'The updated cart document' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart or line item not found' },
      },
    },
  },
  '/api/carts/{id}/clear': {
    post: {
      summary: 'Clear all items from the cart',
      description: 'Removes all line items from the specified cart.',
      tags: ['carts'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the Cart',
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Cart cleared successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  doc: { type: 'object', description: 'The cleared cart document' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Cart not found' },
      },
    },
  },
  '/api/carts/{id}/merge': {
    post: {
      summary: 'Merge guest cart into user cart',
      description: 'Merges all line items from a guest cart into the user\'s authenticated cart.',
      tags: ['carts'],
      security: [
        {
          CookieAuth: [],
        },
        {
          BearerAuth: [],
        },
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'The unique ID of the target Cart (usually the logged-in user\'s cart)',
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
                sourceCartID: {
                  type: 'string',
                  description: 'The ID of the guest cart to merge items from',
                },
                sourceSecret: {
                  type: 'string',
                  description: 'The secret associated with the guest cart',
                },
              },
              required: ['sourceCartID'],
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Cart merged successfully.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  doc: { type: 'object', description: 'The updated target cart document' },
                },
              },
            },
          },
        },
        400: { description: 'Invalid guest cart or secret' },
        401: { description: 'Unauthorized' },
        404: { description: 'Target cart not found' },
      },
    },
  },
}
