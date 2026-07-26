'use client'

import { useChat } from '@ai-sdk/react'
import { type UIMessage } from 'ai'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Settings, Send, Loader2, X, ChevronRight } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// --- Types ---
type ProviderKey = 'openai' | 'google' | 'anthropic' | 'vercel'
interface AgentConfig {
  provider: ProviderKey
  apiKey: string
}

// --- Markdown rendering for assistant messages ---
// Defined at module scope so it isn't recreated on every render.
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h3 className="font-semibold text-sm mb-2 mt-3 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="font-semibold text-sm mb-2 mt-3 first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="font-semibold text-xs mb-1.5 mt-2.5 first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground my-2">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  hr: () => <hr className="border-border my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-md border border-border">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-medium border-b border-border">{children}</th>
  ),
  td: ({ children }) => <td className="px-2 py-1.5 border-b border-border/50">{children}</td>,
  // Strip the default <pre> wrapper — the code component below fully owns block-level styling,
  // so letting <pre> also wrap it would double up the box.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? '')
    if (!match) {
      return (
        <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[0.8em] font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: '0.5rem 0',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          padding: '0.75rem',
        }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    )
  },
}

// Your API route returns `{ error: "message" }` JSON on non-2xx responses.
// useChat's default error surfaces that as a raw string — try to unwrap it for display.
function formatErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: string }
    if (parsed?.error) return parsed.error
  } catch {
    // Not JSON — just show the raw message.
  }
  return error.message
}

// --- Settings Modal ---
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<AgentConfig>({
    provider: 'openai',
    apiKey: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/globals/agent-settings')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((data) => {
        setConfig({
          provider: (data.provider as ProviderKey) ?? 'openai',
          apiKey: (data.apiKey as string) ?? '',
        })
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/globals/agent-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body?.message ?? `${res.status} ${res.statusText}`)
      }
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">Agent Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/20 rounded-md px-3 py-2">{error}</p>
            )}

            <label className="block">
              <span className="text-sm font-medium text-foreground mb-1 block">AI Provider</span>
              <select
                value={config.provider}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, provider: e.target.value as ProviderKey }))
                }
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
                <option value="anthropic">Anthropic</option>
                <option value="vercel">Vercel AI (v0)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-foreground mb-1 block">Provider API Key</span>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="sk-..."
                autoComplete="off"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-muted text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:opacity-90 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Tool call badge shown while AI is calling a tool ---
// In AI SDK v7, tool parts have type `tool-${toolName}` and fields: toolCallId, state, input
function ToolCallBadge({ toolType, input }: { toolType: string; input: unknown }) {
  const toolName = toolType.replace(/^tool-/, '')
  const args = (input ?? {}) as Record<string, unknown>

  const label =
    toolName === 'readSourceFile'
      ? `Reading: ${String(args.filepath ?? '…')}`
      : toolName === 'listDirectory'
        ? `Listing: ${String(args.dirpath ?? '…')}`
        : toolName === 'getPayloadTypes'
          ? args.typeName
            ? `Reading type: ${String(args.typeName)}`
            : 'Browsing Payload types…'
          : `Running ${toolName}…`

  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground border border-border rounded-full px-3 py-1 my-1">
      <Loader2 size={10} className="animate-spin" />
      {label}
    </span>
  )
}

// --- Message bubble ---
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border shadow-sm rounded-tl-sm text-card-foreground'
        }`}
      >
        {(message.parts ?? []).map((part, i) => {
          if (part.type === 'text') {
            // User input is plain text they typed — no reason to run it through a markdown parser.
            if (isUser) {
              return (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              )
            }
            return (
              <div key={i}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {part.text}
                </ReactMarkdown>
              </div>
            )
          }
          // In AI SDK v7, tool parts have type `tool-${name}` and carry input/state directly
          if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
            const anyPart = part as any
            if (anyPart.state === 'input-streaming' || anyPart.state === 'input-available') {
              return (
                <ToolCallBadge
                  key={i}
                  toolType={part.type}
                  input={anyPart.input}
                />
              )
            }
            return null
          }
          return null
        })}
      </div>
    </div>
  )
}

// --- Main page ---
export default function AgentPage() {
  // AI SDK v7: useChat returns sendMessage, messages, status — not input/handleSubmit
  const { messages, sendMessage, status, error } = useChat()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    void sendMessage({ text })
  }

  const handleSuggest = (question: string) => {
    if (isLoading) return
    void sendMessage({ text: question })
  }

  const errorMessage = error ? formatErrorMessage(error) : null
  const isConfigError = errorMessage?.toLowerCase().includes('not configured') ?? false

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Developer Agent</h1>
          <p className="text-xs text-muted-foreground">Ask anything about the Payload CMS backend APIs</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-md">
                A
              </div>
              <h2 className="font-semibold text-foreground">API Integration Assistant</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me about endpoints, authentication flows, data schemas, filtering and
                pagination, or how to implement specific integrations with this Payload backend.
              </p>
              <div className="flex flex-col gap-2 mt-4 w-full max-w-sm">
                {[
                  'How do I authenticate via mobile OTP?',
                  'What fields does the Retailers collection have?',
                  'How do I filter products by brand?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggest(q)}
                    className="text-left text-xs bg-card border border-border rounded-lg px-3 py-2.5 hover:bg-muted flex items-center justify-between group transition-colors shadow-sm"
                  >
                    <span className="text-card-foreground">{q}</span>
                    <ChevronRight
                      size={12}
                      className="text-muted-foreground group-hover:text-foreground shrink-0 ml-2 transition-colors"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-card border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="text-center text-sm text-error py-2">
              <p>{errorMessage}</p>
              {isConfigError && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="underline underline-offset-2 mt-1"
                >
                  Open Settings
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-card border-t border-border p-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about endpoints, schemas, authentication…"
            disabled={isLoading}
            className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 text-foreground"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}