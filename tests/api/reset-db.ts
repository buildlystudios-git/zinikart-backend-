import 'dotenv/config'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pgPath = require.resolve('pg', { paths: [require.resolve('@payloadcms/db-postgres')] })
const pg = require(pgPath)

async function run() {
  console.log('Connecting to database directly via pg.Client resolved from @payloadcms/db-postgres...')
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || '',
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL database.')

    console.log('Dropping and recreating payload schema...')
    await client.query('DROP SCHEMA IF EXISTS "payload" CASCADE; CREATE SCHEMA "payload";')

    console.log('Database schema "payload" cleared successfully!')
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error('Error resetting database:', err)
    try {
      await client.end()
    } catch {}
    process.exit(1)
  }
}

void run()
