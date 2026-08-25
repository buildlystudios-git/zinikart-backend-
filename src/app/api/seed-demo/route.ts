import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { seedDemoData } from '@/endpoints/seed/seedDemoData'

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    await seedDemoData(payload)
    return Response.json({ success: true, message: 'Demo data seeded successfully for all collections!' })
  } catch (e: any) {
    return Response.json({ success: false, error: e?.message || 'Error seeding demo data' }, { status: 500 })
  }
}

export async function POST(): Promise<Response> {
  return GET()
}
