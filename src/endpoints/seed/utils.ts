import type { Payload } from 'payload'

export async function fetchFileByURL(url: string): Promise<{ name: string; data: Buffer; mimetype: string; size: number }> {
  const res = await fetch(url, {
    credentials: 'include',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()

  return {
    name: url.split('/').pop() || `file-${Date.now()}`,
    data: Buffer.from(data),
    mimetype: `image/${url.split('.').pop()}`,
    size: data.byteLength,
  }
}

export async function fetchImageWithFallback(
  payload: Payload,
  url: string | null | undefined,
  fallbackImageId: string | number
): Promise<string | number> {
  if (!url) return fallbackImageId
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      }
    })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const filename = url.split('/').pop() || `phone-${Date.now()}.webp`
    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: filename,
      },
      file: {
        name: filename,
        data: Buffer.from(arrayBuffer),
        mimetype: `image/${filename.split('.').pop() || 'webp'}`,
        size: arrayBuffer.byteLength,
      },
    })
    return (mediaDoc as any).id as string
  } catch (err) {
    payload.logger.warn(`Failed to fetch image ${url}, falling back.`)
    return fallbackImageId
  }
}

export function parseReleaseDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined
  const cleaned = dateStr.replace(/Exp\.|Rumored|Upcoming|Announced/gi, '').trim()
  const parsed = Date.parse(cleaned)
  if (isNaN(parsed)) return undefined
  return new Date(parsed).toISOString().split('T')[0]
}

export function createLexicalDescription(text: string): any {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1,
            },
          ],
        },
      ],
    },
  }
}
