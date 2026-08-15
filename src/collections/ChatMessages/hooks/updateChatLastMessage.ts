import type { CollectionAfterChangeHook } from 'payload'
import { sendFcmPush } from '@/lib/fcm'

const WS_INTERNAL_URL = process.env.WS_INTERNAL_URL || 'http://localhost:3001'
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'dev-ws-internal-secret'

async function broadcastToWsService(chatId: string, type: string, payload: any, excludeUserId?: string): Promise<void> {
  try {
    const res = await fetch(`${WS_INTERNAL_URL}/internal/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Internal ${WS_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({ chatId, type, payload, excludeUserId }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.warn(`[Chat] WS broadcast returned ${res.status}`)
  } catch (err: any) {
    // WS service is not running — real-time will be unavailable but data is safe
    console.warn('[Chat] WS service unavailable for broadcast:', err.message)
  }
}

async function isUserOnlineViaWsService(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${WS_INTERNAL_URL}/internal/online?userId=${userId}`, {
      headers: { 'Authorization': `Internal ${WS_INTERNAL_SECRET}` },
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.online === true
  } catch {
    return false  // Assume offline if WS service unreachable
  }
}

export const updateChatLastMessage: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return doc

  const chatId = typeof doc.chat === 'object' && doc.chat !== null ? doc.chat.id || doc.chat : doc.chat

  // 1. Update the parent chat with the latest message time and preview
  await req.payload.update({
    collection: 'support-chats',
    id: chatId,
    data: {
      lastMessageAt:      new Date().toISOString(),
      lastMessagePreview: doc.content ? doc.content.slice(0, 100) : 'Attachment',
      status:             'open',
    },
    req,
  })

  const senderObj = typeof doc.sender === 'object' && doc.sender !== null ? doc.sender : null
  const senderId = senderObj ? senderObj.id : doc.sender

  // 2. Real-time broadcast via the standalone WS service
  // Pick only essential fields to avoid sending massive Payload objects over WS
  const messagePayload = {
    id: doc.id,
    content: doc.content,
    sender: senderObj ? { id: senderObj.id, name: senderObj.name, email: senderObj.email } : senderId,
    senderRole: doc.senderRole, // UI needs this for left/right alignment
    createdAt: doc.createdAt,
    readBy: doc.readBy || [],
    attachments: doc.attachments || [],
  }
  
  await broadcastToWsService(chatId, 'message_new', { chatId, message: messagePayload }, senderId as string)

  // 3. Offline fallback: push FCM to recipients who are not on a live socket
  const chat = await req.payload.findByID({
    collection: 'support-chats',
    id: chatId,
    depth: 0,
    req,
  })

  const recipientIds = [(chat as any).initiator, ...((chat as any).participants ?? []).map((p: any) => p.user)]
    .filter((id) => id && id !== senderId)

  await Promise.all(
    recipientIds.map(async (id) => {
      const online = await isUserOnlineViaWsService(id)
      if (!online) await sendFcmPush(id, doc)
    })
  )

  return doc
}

