import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function run() {
    console.log("Initializing Payload CMS...")
    const payload = await getPayload({ config: configPromise })

    try {
        await payload.create({
            collection: "transactions",
            data: {
                customerEmail: "917696499609@otp.zinikart.local",
                amount: 3000,
                billingAddress: {},
                cart: '00000000-0000-0000-0000-000000000000',
                currency: "INR",
                items: [],
                paymentMethod: 'cod',
                status: 'pending',
            }
        })
        process.exit(0)
    } catch (err: any) {
        console.error("Error:", err.message)
        process.exit(1)
    }
}

run()
