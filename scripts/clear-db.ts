import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import { sql } from '@payloadcms/db-postgres'

async function run() {
  console.log("Initializing Payload CMS...")
  const payload = await getPayload({ config: configPromise })

  console.log("Truncating all database tables in payload schema and resetting sequences...")
  try {
    await payload.db.execute({
      db: (payload.db as any).drizzle,
      sql: sql`
        DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'payload') LOOP
                EXECUTE 'DROP TABLE IF EXISTS "payload".' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
      `,
    })
    console.log("Database cleared successfully!")
    process.exit(0)
  } catch (err: any) {
    console.error("Error clearing database:", err.message)
    process.exit(1)
  }
}

run()
