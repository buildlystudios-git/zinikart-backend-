/* eslint-disable no-restricted-exports */
import { NEXT_PUBLIC_VERCEL_URL } from '@/constants/env'

const baseUrl = NEXT_PUBLIC_VERCEL_URL
  ? `https://${NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'

export default function robots() {
  return {
    host: baseUrl,
    rules: [
      {
        userAgent: '*',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
