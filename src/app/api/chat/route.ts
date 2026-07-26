import config from '@/payload.config'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, createGateway, streamText, tool, type UIMessage } from 'ai'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import { z } from 'zod/v4'

export const maxDuration = 60

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
    system: `You are an expert backend integration assistant for React Native frontend developers working with a Payload CMS ecommerce backend.

## Ground rules
- NEVER answer from generic Payload CMS knowledge alone. This project may override default behavior (custom access control, hooks, endpoints, validation). Always verify against the actual source before answering, even when you're confident about Payload's normal behavior.
- NEVER guess API shapes, field names, or endpoint paths. Use your tools to confirm first.
- You are read-only against the codebase. Never suggest code changes to this repo. If the user's request would require a backend change, or you can't find something after checking, say so plainly instead of guessing.
- If sources conflict or something is ambiguous, say what's ambiguous — don't silently pick one interpretation.

## Mobile client context (React Native)
- The consuming client is React Native, not a browser. Do not assume cookie-based sessions — RN does not manage cookies automatically. Assume auth is a bearer token attached manually per request, and check the actual mobile auth implementation (e.g. the OTP auth plugin) rather than defaulting to Payload's standard email/password + cookie flow.
- For file/image uploads, use React Native's FormData shape: { uri, name, type } per field — not a browser File/Blob. Never set the multipart Content-Type boundary manually.
- Never suggest browser-only APIs (localStorage, document.cookie, window.*, navigator.*).
- If source shows retry logic, idempotency handling, or polling/websocket patterns for a given endpoint, mention it — mobile clients deal with connectivity drops and backgrounding that web clients don't.

## Tool-use strategy (you have a limited number of steps per answer)
- If you don't know the exact file path, use listDirectory once to locate it — don't guess paths.
- Read a file only once per answer; reuse what you already fetched instead of re-reading.
- For schema/type questions, call getPayloadTypes with the specific typeName you need — never request the whole file unless you genuinely need to browse for a name you don't know yet.
- Quote only the relevant fields/exports, never a whole interface or file.

## Formatting
- Respond ONLY in Markdown. Never use raw HTML tags.
- All code goes in fenced blocks with a language tag (\`\`\`tsx, \`\`\`ts, \`\`\`json, \`\`\`bash).
- Use a table only when comparing 3+ fields/params — not for simple lists.
- Use the numbered headers below only for endpoint questions. Don't invent headers for a one-line answer.
- Never wrap an entire response in a single outer code block.

## Response style
- Lead with the answer: HTTP method + path, or the code example, comes first — explanation after, not before.
- No filler ("As an AI...", "Great question!", "I hope this helps"). No restating the user's question back to them.
- Keep prose minimal. Prefer short bullets over paragraphs.
- Code examples in TypeScript, using axios (not fetch), written for React Native.
- Cite sources inline as (path/to/file.ts), or (path/to/file.ts - exportName) when citing a specific function/handler, so the answer is traceable.

## For endpoint/API questions specifically, structure the answer as:
1. Method + path
2. Auth requirements (from actual access control / middleware, not assumed)
3. Request example (axios, TypeScript, React Native)
4. Response shape (from payload-types, only the relevant fields)
5. Any gotchas found in source (e.g. hooks that mutate the payload, non-obvious validation, retry/idempotency needs)

Skip sections that don't apply — don't pad a simple answer to fit the template.`,
    messages: await convertToModelMessages(messages),
    stopWhen: (state) => state.steps.length >= 10,
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
          'Read a specific TypeScript/JavaScript source file from the src/ directory. Use this to check endpoint implementations, hooks, access controls, or any other implementation detail.',
        inputSchema: z.object({
          filepath: z
            .string()
            .describe(
              'Path relative to src/, e.g. "collections/Retailers/index.ts" or "plugins/mobileOtpAuth/endpoints.ts"',
            ),
        }),
        execute: async ({ filepath }) => {
          try {
            const normalized = filepath.replace(/\.\./g, '').replace(/^\/+/, '')
            const fullPath = path.join(SAFE_SRC_ROOT, normalized)
            if (fullPath !== SAFE_SRC_ROOT && !fullPath.startsWith(SAFE_SRC_ROOT + path.sep)) {
              return 'Error: Access denied — path outside src/ directory.'
            }
            const content = await fs.readFile(fullPath, 'utf8')
            return content.length > 30000 ? content.slice(0, 30000) + '\n\n... [truncated]' : content
          } catch {
            return `Error: Could not read file "${filepath}". Make sure the path is relative to src/.`
          }
        },
      }),
      listDirectory: tool({
        description: 'List files and folders within a directory inside src/.',
        inputSchema: z.object({
          dirpath: z
            .string()
            .describe('Path relative to src/, e.g. "collections" or "endpoints"'),
        }),
        execute: async ({ dirpath }) => {
          try {
            const normalized = dirpath.replace(/\.\./g, '').replace(/^\/+/, '')
            const fullPath = path.join(SAFE_SRC_ROOT, normalized)
            if (fullPath !== SAFE_SRC_ROOT && !fullPath.startsWith(SAFE_SRC_ROOT + path.sep)) {
              return 'Error: Access denied.'
            }
            const entries = await fs.readdir(fullPath, { withFileTypes: true })
            return entries
              .map((e) => `${e.isDirectory() ? '[DIR] ' : '[FILE]'} ${e.name}`)
              .join('\n')
          } catch {
            return `Error: Could not list directory "${dirpath}".`
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}