import { canUseDOM } from './canUseDOM'
import { NEXT_PUBLIC_SERVER_URL, VERCEL_PROJECT_PRODUCTION_URL } from '@/constants/env'

export const getServerSideURL = () => {
  let url = NEXT_PUBLIC_SERVER_URL

  if (!url && VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (!url) {
    url = 'http://localhost:3000'
  }

  return url
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  if (VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return NEXT_PUBLIC_SERVER_URL || ''
}
