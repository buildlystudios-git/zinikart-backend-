import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function run() {
    console.log("Initializing Payload CMS...")
    const payload = await getPayload({ config: configPromise })

    try {
        const clonedProducts = await payload.find({
          collection: 'products',
          where: {
            isMasterTemplate: { equals: false },
            enableVariants: { not_equals: true },
            priceInINR: { greater_than: 0 },
          },
          limit: 1,
          overrideAccess: true,
        })
        const product = clonedProducts.docs[0]
        console.log("Product ID:", product?.id)
        console.log("Product retailer:", product?.retailer)

        const testUser = await payload.find({ collection: 'users', limit: 1 })
        
        console.log("Attempting to create order...")
        const order = await payload.create({
            collection: 'orders',
            data: {
              amount: 100,
              currency: 'INR',
              customer: testUser.docs[0]?.id,
              items: [{ product: product.id, quantity: 1, price: 100 }],
              shippingAddress: { street: '123', city: 'A', state: 'B', zipCode: '111111', country: 'IN', phone: '123' },
              status: 'placed',
            },
            overrideAccess: true,
        })
        console.log("Success! Order ID:", order.id)

    } catch (err: any) {
        console.error("Error creating order:", err.message)
        if (err.data) {
            console.error("Validation details:", JSON.stringify(err.data, null, 2))
        }
    }

    process.exit(0)
}

run()
