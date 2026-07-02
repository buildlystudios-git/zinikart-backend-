import 'dotenv/config'
import { getPayload, createLocalReq } from 'payload'
import config from '../src/payload.config'
import { seed } from '../src/endpoints/seed'

async function run() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config })
  
  // Create mock request
  const req = await createLocalReq({}, payload)
  
  console.log('Starting seed process...')
  await seed({ payload, req })
  
  console.log('Verifying seeded brands and products...')
  const brands = await payload.find({
    collection: 'brands',
    limit: 100,
  })
  
  const products = await payload.find({
    collection: 'products',
    limit: 100,
  })
  
  console.log(`Seeded ${brands.totalDocs} brands:`, brands.docs.map(b => b.name))
  console.log(`Seeded ${products.totalDocs} products`)
  
  process.exit(0)
}

run().catch(err => {
  console.error('Seed execution failed:', err)
  process.exit(1)
})
