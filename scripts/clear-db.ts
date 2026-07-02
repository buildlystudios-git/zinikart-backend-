import 'dotenv/config'
import pg from 'pg'

async function run() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("DATABASE_URL is not set in the environment.")
    process.exit(1)
  }

  console.log("Connecting directly to PostgreSQL...")
  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('db.prisma.io')
      ? { rejectUnauthorized: false }
      : undefined
  })

  try {
    await client.connect()
    console.log("Connected successfully. Dropping database schemas and tables...")

    // 1. Drop payload schema completely
    console.log("Dropping payload schema...")
    await client.query('DROP SCHEMA IF EXISTS "payload" CASCADE;')
    await client.query('CREATE SCHEMA "payload";')

    // 2. Drop all tables in public schema
    console.log("Dropping all tables in public schema...")
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS "public".' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `)

    console.log("Database tables and schemas completely dropped and reset successfully!")
    await client.end()
    process.exit(0)
  } catch (err: any) {
    console.error("Error clearing database:", err)
    try {
      await client.end()
    } catch (_) {}
    process.exit(1)
  }
}

run()
