import type { Endpoint } from 'payload'
import { checkRole } from '@/access/utilities'

const WS_INTERNAL_URL = process.env.WS_INTERNAL_URL || 'http://localhost:3001'
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'dev-ws-internal-secret'

export const chatPresenceEndpoint: Endpoint = {
  path: '/presence',
  method: 'get',
  handler: async (req) => {
    try {
      if (!req.user || !checkRole(['admin'], req.user)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      const url = new URL(req.url!, 'http://localhost')
      const userIds = url.searchParams.getAll('userIds[]')

      if (!userIds || userIds.length === 0) {
        return Response.json({ error: 'Missing userIds[]' }, { status: 400 })
      }

      // Query online status from the standalone WS service
      const presence: Record<string, boolean> = {}
      await Promise.all(
        userIds.map(async (id) => {
          try {
            const res = await fetch(`${WS_INTERNAL_URL}/internal/online?userId=${id}`, {
              headers: { Authorization: `Internal ${WS_INTERNAL_SECRET}` },
              signal: AbortSignal.timeout(2000),
            })
            const data = res.ok ? await res.json() : { online: false }
            presence[id] = data.online === true
          } catch {
            presence[id] = false
          }
        })
      )

      return Response.json({ presence })
    } catch (error: any) {
      return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
  },
}

