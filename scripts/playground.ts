import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function run() {
  const payload = await getPayload({ config: configPromise })
  
  console.log('Deleting all stray orders...')
  const orders = await payload.find({ collection: 'orders', overrideAccess: true })
  for (const order of orders.docs) {
    await payload.delete({ collection: 'orders', id: order.id, overrideAccess: true })
    console.log(`Deleted order ${order.id}`)
  }
  
  console.log('Deleting all retailers...')
  const retailers = await payload.find({ collection: 'retailers', overrideAccess: true })
  for (const retailer of retailers.docs) {
    await payload.delete({ collection: 'retailers', id: retailer.id, overrideAccess: true })
    console.log(`Deleted retailer ${retailer.id}`)
  }

  console.log('Deleting all delivery partners...')
  const dps = await payload.find({ collection: 'delivery-partners', overrideAccess: true })
  for (const dp of dps.docs) {
    await payload.delete({ collection: 'delivery-partners', id: dp.id, overrideAccess: true })
    console.log(`Deleted delivery partner ${dp.id}`)
  }
  
  console.log('Deleting all test users...')
  const users = await payload.find({ collection: 'users', where: { email: { contains: 'testing.zinikart.local' } }, overrideAccess: true })
  for (const user of users.docs) {
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
    console.log(`Deleted user ${user.id}`)
  }
  
  process.exit(0)
}
run()
