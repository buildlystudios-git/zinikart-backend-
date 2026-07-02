import 'dotenv/config'
import pg from 'pg'

async function run() {
  console.log("Connecting directly to PostgreSQL database...")
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL
  })
  
  await client.connect()
  console.log("Dropping all database tables in payload schema...")
  
  try {
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'payload') LOOP
              EXECUTE 'DROP TABLE IF EXISTS "payload".' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `)
    console.log("All tables dropped successfully!")
    process.exit(0)
  } catch (err: any) {
    console.error("Error dropping database tables:", err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
