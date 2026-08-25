import config from '@/payload.config'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, createGateway, streamText, tool, type UIMessage } from 'ai'
import { systemPrompt } from './systemPrompt'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { z } from 'zod/v4'

export const maxDuration = 120

// Extracts a single named export (interface/type) instead of returning the whole file.
// Falls back to null if the name isn't found, so the caller can decide what to do.
function extractNamedExport(source: string, typeName: string): string | null {
  const startPattern = new RegExp(`export\\s+(interface|type)\\s+${typeName}\\b`)
  const match = startPattern.exec(source)
  if (!match) return null

  const startIdx = match.index
  const firstBrace = source.indexOf('{', startIdx)
  if (firstBrace === -1) {
    // type alias without braces, e.g. `export type Foo = 'a' | 'b'` — grab to the next `;` or newline
    const endIdx = source.indexOf(';', startIdx)
    return source.slice(startIdx, endIdx !== -1 ? endIdx + 1 : undefined)
  }

  let depth = 0
  for (let i = firstBrace; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(startIdx, i + 1)
    }
  }
  return null
}

async function searchFilesRecursively(dir: string, query: string, rootDir: string, results: string[] = []): Promise<string[]> {
  if (results.length >= 50) return results
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (results.length >= 50) break
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', '.next', 'dist', 'build', 'app'].includes(entry.name)) {
        await searchFilesRecursively(fullPath, query, rootDir, results)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      try {
        const content = await fs.readFile(fullPath, 'utf8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(query)) {
            const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/')
            results.push(`${relativePath}:${i + 1}: ${lines[i].trim()}`)
            if (results.length >= 50) break
          }
        }
      } catch {
        // ignore unreadable files
      }
    }
  }
  return results
}

export async function POST(req: Request) {
  const payload = await getPayload({ config })

  const authResult = await payload.auth({ headers: req.headers })
  const user = authResult?.user

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agentSettings = await payload.findGlobal({
    slug: 'agent-settings',
    overrideAccess: true,
  })

  const { provider, apiKey, allowedUsers } = agentSettings

  if (!provider || !apiKey) {
    return Response.json(
      { error: 'Agent not configured. Set provider and API key in Agent Settings.' },
      { status: 503 },
    )
  }

  const userRoles = (user as any).roles as string[] | undefined
  const isAdmin = userRoles?.includes('admin') === true
  const allowedUserIds: string[] = ((allowedUsers ?? []) as any[]).map((u) =>
    typeof u === 'string' ? u : u.id,
  )
  if (!isAdmin && !allowedUserIds.includes(user.id as string)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const providerOptions = {
    apiKey: apiKey as string,
  }

  // NOTE: verify each of these against the provider's live model list before deploying —
  // model names are moving fast and this table will go stale again within months.
  let model
  if (provider === 'openai') {
    model = createOpenAI(providerOptions)('gpt-5.6-terra') // balances cost/intelligence per OpenAI's own model guidance
  } else if (provider === 'google') {
    model = createGoogleGenerativeAI(providerOptions)('gemini-3.5-flash') // current GA flash model, tuned for agentic/coding tasks
  } else if (provider === 'anthropic') {
    model = createAnthropic(providerOptions)('claude-sonnet-5') // near-Opus coding quality without Opus pricing
  } else if (provider === 'vercel') {
    model = createGateway(providerOptions)('openai/gpt-5.6-terra')
  } else {
    return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const SAFE_SRC_ROOT = path.join(process.cwd(), 'src')

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: (state) => {
      const last = state.steps[state.steps.length - 1]
      const hitCap = state.steps.length >= 8
      const lastWasToolCall = last?.content?.some((c) => c.type === 'tool-call')
      // never stop exactly on a tool-call step — give it one more turn to answer
      return hitCap && !lastWasToolCall
    }, 
    onFinish: ({ usage }) => {
      console.log(`[agent-usage] user=${user.id} provider=${provider}`, usage)
    },
    tools: {
      getPayloadTypes: tool({
        description:
          'Get a specific TypeScript type/interface from the auto-generated Payload types (payload-types.ts). Pass the exact export name (e.g. "Order", "Retailer"). Omit typeName only if you need to browse the full file to find a name you don\'t know yet — prefer passing typeName whenever possible to save tokens.',
        inputSchema: z.object({
          typeName: z
            .string()
            .optional()
            .describe('Exact exported type/interface name, e.g. "Order" or "Retailer"'),
        }),
        execute: async ({ typeName }) => {
          try {
            const filePath = path.join(SAFE_SRC_ROOT, 'payload-types.ts')
            const content = await fs.readFile(filePath, 'utf8')

            if (typeName) {
              const extracted = extractNamedExport(content, typeName)
              if (extracted) return extracted
              return `Error: No export named "${typeName}" found in payload-types.ts. Try omitting typeName to browse the full file.`
            }

            return content.length > 40000 ? content.slice(0, 40000) + '\n\n... [truncated]' : content
          } catch {
            return 'Error: Could not read payload-types.ts'
          }
        },
      }),
      readSourceFile: tool({
        description:
          'Read a specific TypeScript/JavaScript source file from the src/ directory. Use this to check endpoint implementations, hooks, access controls, or any other implementation detail. You can optionally provide startLine and endLine to read a specific chunk of the file.',
        inputSchema: z.object({
          filepath: z
            .string()
            .describe(
              'Path relative to src/, e.g. "collections/Retailers/index.ts" or "plugins/mobileOtpAuth/endpoints.ts"',
            ),
          startLine: z.number().optional().describe('1-indexed start line number to read.'),
          endLine: z.number().optional().describe('1-indexed end line number to read.'),
        }),
        execute: async ({ filepath, startLine, endLine }) => {
          try {
            const normalized = filepath.replace(/\.\./g, '').replace(/^\/+/, '')
            const fullPath = path.join(SAFE_SRC_ROOT, normalized)
            if (fullPath !== SAFE_SRC_ROOT && !fullPath.startsWith(SAFE_SRC_ROOT + path.sep)) {
              return 'Error: Access denied — path outside src/ directory.'
            }
            let content = await fs.readFile(fullPath, 'utf8')
            if (typeof startLine === 'number' && typeof endLine === 'number') {
              const lines = content.split('\n')
              content = lines.slice(Math.max(0, startLine - 1), endLine).join('\n')
            }
            return content.length > 30000 ? content.slice(0, 30000) + '\n\n... [truncated]' : content
          } catch {
            return `Error: Could not read file "${filepath}". Make sure the path is relative to src/.`
          }
        },
      }),
      exploreDirectory: tool({
        description: 'Explore a directory inside src/ up to 2 levels deep. Returns immediate children AND their children in one call. Use this only when searchCode returns no results and you need to navigate the folder structure.',
        inputSchema: z.object({
          dirpath: z
            .string()
            .describe('Path relative to src/, e.g. "collections" or "endpoints/retailers"'),
          depth: z.number().min(1).max(2).optional().default(2).describe('How many levels deep to list. Defaults to 2.'),
        }),
        execute: async ({ dirpath, depth = 2 }) => {
          const renderDir = async (fullPath: string, currentDepth: number, prefix = ''): Promise<string> => {
            let out = ''
            let entries: import('fs').Dirent[]
            try {
              entries = await fs.readdir(fullPath, { withFileTypes: true })
            } catch {
              return `Error: Could not read directory.`
            }
            const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))
            const files = entries.filter(e => e.isFile()).sort((a, b) => a.name.localeCompare(b.name))
            if (files.length) out += `${prefix}[files]: ${files.map(f => f.name).join(', ')}\n`
            for (const d of dirs) {
              out += `${prefix}[dir] ${d.name}/\n`
              if (currentDepth > 1) {
                out += await renderDir(path.join(fullPath, d.name), currentDepth - 1, prefix + '  ')
              }
            }
            return out
          }
          try {
            const normalized = dirpath.replace(/\.\./g, '').replace(/^\/+/, '')
            const fullPath = path.join(SAFE_SRC_ROOT, normalized)
            if (fullPath !== SAFE_SRC_ROOT && !fullPath.startsWith(SAFE_SRC_ROOT + path.sep)) {
              return 'Error: Access denied.'
            }
            return await renderDir(fullPath, depth)
          } catch {
            return `Error: Could not explore directory "${dirpath}".`
          }
        },
      }),
      getPayloadConfig: tool({
        description: 'Read the payload.config.ts file to see which collections and globals are registered in this project. Call this before searching for collection-specific files so you know what exists.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const configPath = path.join(SAFE_SRC_ROOT, 'payload.config.ts')
            const content = await fs.readFile(configPath, 'utf8')
            return content.length > 15000 ? content.slice(0, 15000) + '\n\n... [truncated]' : content
          } catch {
            return 'Error: Could not read payload.config.ts'
          }
        },
      }),
      searchCode: tool({
        description: 'Search for a string or keyword across all TypeScript files in the src/ directory. Use this to find where specific functions, schemas, or variables are defined.',
        inputSchema: z.object({
          query: z.string().describe('The text to search for, e.g. "export const Retailers"'),
        }),
        execute: async ({ query }) => {
          try {
            if (query.length < 3) return 'Error: Query must be at least 3 characters long.'
            const results = await searchFilesRecursively(SAFE_SRC_ROOT, query, SAFE_SRC_ROOT)
            if (results.length === 0) return 'No matches found.'
            return results.join('\n') + (results.length >= 50 ? '\n\n... [truncated 50+ matches]' : '')
          } catch {
            return 'Error: Search failed.'
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}