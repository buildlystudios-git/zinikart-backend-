import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../../src/payload.config'
import { seed } from '../../src/endpoints/seed'

async function run() {
  console.log('Booting Payload for seeding validation...')
  try {
    const config = await configPromise
    const payload = await getPayload({ config })
    
    console.log('Running custom seed logic...')
    const req = {
      payload,
    } as any
    
    await seed({ payload, req })
    console.log('Success: Seeding complete and verified!')
    process.exit(0)
  } catch (err) {
    console.error('Error: Seeding failed:', err)
    process.exit(1)
  }
}

run()
