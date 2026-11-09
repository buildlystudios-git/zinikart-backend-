import 'dotenv/config'

import { createServer, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { getPayload } from 'payload'
import configPromise from './src/payload.config'
import { WS_PORT, WS_INTERNAL_SECRET } from './src/constants/env'

const PORT = WS_PORT
const INTERNAL_SECRET = WS_INTERNAL_SECRET

type AuthedUser = { id: string; role: string; roles: string[] }

// ─── In-memory socket registry ───────────────────────────────────────────────
const userSockets   = new Map<string, Set<WebSocket>>()
const chatRooms     = new Map<string, Set<string>>()     // chatId → Set<userId>
const orderRooms    = new Map<string, Set<string>>()     // orderId → Set<userId>
const retailerFeeds = new Map<string, Set<WebSocket>>()  // retailerUserId → Set<WebSocket>
const dpFeeds       = new Map<string, Set<WebSocket>>()  // dpUserId → Set<WebSocket>

const socketMeta = new WeakMap<
  WebSocket,
  {
    userId: string
    chatIds: Set<string>
    orderIds: Set<string>
    isRetailerFeed?: boolean
    isDpFeed?: boolean
  }
>()

// ─── Payload singleton ────────────────────────────────────────────────────────
let _payload: Awaited<ReturnType<typeof getPayload>> | null = null
async function getPayloadClient() {
  if (!_payload) _payload = await getPayload({ config: configPromise })
  return _payload
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function handleAuth(req: IncomingMessage): Promise<AuthedUser | null> {
  try {
    const payload = await getPayloadClient()
    // Convert Node.js IncomingMessage headers → standard Web Headers
    const webHeaders = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) value.forEach(v => webHeaders.append(key, v))
      else webHeaders.set(key, value)
    }

    // Browsers on a different subdomain cannot send cookies cross-origin.
    // Solution: Frontend reads the payload-token cookie and passes it as ?token=
    // We inject it as an Authorization header so Payload's auth() can resolve it.
    if (!webHeaders.has('authorization')) {
      const urlParams = new URL(req.url || '/', `http://localhost`).searchParams
      const token = urlParams.get('token')
      if (token) {
        webHeaders.set('Authorization', `JWT ${token}`)
      }
    }

    const { user } = await payload.auth({ headers: webHeaders as any })
    if (!user) {
      console.log('[Chat WS] Auth failed: no user resolved from token')
      return null
    }
    const roles: string[] = (user as any).roles || []
    const role = roles[0] || 'customer'
    console.log(`[WS] Auth OK — user ${user.id} (role: ${role}, roles: ${roles.join(',')})`)
    return { id: String(user.id), role, roles }
  } catch (err: any) {
    console.error('[WS] Auth error:', err.message)
    return null
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────
function handleConnection(ws: WebSocket, user: AuthedUser) {
  (ws as any).isAlive = true
  ws.on('pong', () => { (ws as any).isAlive = true })

  if (!userSockets.has(user.id)) userSockets.set(user.id, new Set())
  userSockets.get(user.id)!.add(ws)
  socketMeta.set(ws, {
    userId: user.id,
    chatIds: new Set(),
    orderIds: new Set(),
    isRetailerFeed: false,
    isDpFeed: false,
  })

  console.log(`[WS] ✓ Connected: ${user.id} (${user.role}) | online users: ${userSockets.size}`)

  ws.on('message', (raw) => handleMessage(ws, user, raw.toString()))
  ws.on('close', (code) => {
    console.log(`[Chat WS] Disconnected: ${user.id} (code ${code})`)
    handleDisconnect(ws, user)
  })
  ws.on('error', (err) => {
    console.error(`[Chat WS] Socket error for ${user.id}:`, err.message)
    handleDisconnect(ws, user)
  })
}

// ─── Message dispatch ─────────────────────────────────────────────────────────
async function handleMessage(ws: WebSocket, user: AuthedUser, raw: string) {
  let msg: any
  try {
    msg = JSON.parse(raw)
  } catch {
    return send(ws, 'error', { code: 'bad_json', message: 'Invalid JSON' })
  }

  console.log(`[Chat WS] Message from ${user.id}: type=${msg.type}`)

  switch (msg.type) {
    case 'join_chat':    return handleJoin(ws, user, msg.chatId)
    case 'leave_chat':   return handleLeave(ws, user, msg.chatId)
    case 'send_message': return handleSend(ws, user, msg)
    case 'typing_start': return broadcastToChat(msg.chatId, 'typing', { chatId: msg.chatId, userId: user.id, isTyping: true  }, user.id)
    case 'typing_stop':  return broadcastToChat(msg.chatId, 'typing', { chatId: msg.chatId, userId: user.id, isTyping: false }, user.id)
    case 'mark_read':    return handleMarkRead(user, msg.chatId, msg.messageIds)

    // ─── Order Real-Time Events ───
    case 'join_order':           return handleJoinOrder(ws, user, msg.orderId)
    case 'leave_order':          return handleLeaveOrder(ws, user, msg.orderId)
    case 'join_retailer_feed':   return handleJoinRetailerFeed(ws, user)
    case 'leave_retailer_feed':  return handleLeaveRetailerFeed(ws, user)
    case 'join_dp_feed':         return handleJoinDpFeed(ws, user)
    case 'leave_dp_feed':        return handleLeaveDpFeed(ws, user)

    default:             return send(ws, 'error', { code: 'unknown_type', message: `Unknown type: ${msg.type}` })
  }
}

// ─── Join ─────────────────────────────────────────────────────────────────────
async function handleJoin(ws: WebSocket, user: AuthedUser, chatId: string) {
  if (!chatId) return send(ws, 'error', { code: 'missing_chatId', message: 'chatId is required' })
  try {
    const payload = await getPayloadClient()
    const chat = await payload.findByID({ collection: 'support-chats', id: chatId, depth: 0 })

    const isParticipant =
      user.role === 'admin' ||
      String((chat as any).initiator) === String(user.id) ||
      ((chat as any).participants ?? []).some((p: any) => String(p.user) === String(user.id))

    if (!isParticipant) {
      return send(ws, 'error', { code: 'forbidden', message: 'Not a participant of this chat' })
    }

    socketMeta.get(ws)!.chatIds.add(chatId)
    if (!chatRooms.has(chatId)) chatRooms.set(chatId, new Set())
    chatRooms.get(chatId)!.add(user.id)

    // Confirm join to the requesting socket
    send(ws, 'joined', { chatId, userId: user.id })
    // Announce presence to everyone else in the room
    broadcastToChat(chatId, 'presence', { userId: user.id, online: true }, user.id)

    // Tell the joining user who else is already online
    const onlineParticipants = Array.from(chatRooms.get(chatId)!).filter(id => id !== user.id)
    onlineParticipants.forEach(id => {
      send(ws, 'presence', { userId: id, online: true })
    })

    console.log(`[Chat WS] ${user.id} joined room ${chatId} | room size: ${chatRooms.get(chatId)!.size}`)
  } catch (e: any) {
    console.error(`[Chat WS] handleJoin error:`, e.message)
    return send(ws, 'error', { code: 'not_found', message: 'Chat not found' })
  }
}

// ─── Leave ────────────────────────────────────────────────────────────────────
function handleLeave(ws: WebSocket, user: AuthedUser, chatId: string) {
  socketMeta.get(ws)?.chatIds.delete(chatId)
  chatRooms.get(chatId)?.delete(user.id)
  
  // Announce departure to remaining users in the room
  broadcastToChat(chatId, 'presence', { userId: user.id, online: false })
  
  if (chatRooms.get(chatId)?.size === 0) chatRooms.delete(chatId)
}

// ─── Send message ─────────────────────────────────────────────────────────────
async function handleSend(ws: WebSocket, user: AuthedUser, msg: any) {
  const meta = socketMeta.get(ws)
  if (!meta?.chatIds.has(msg.chatId)) {
    return send(ws, 'error', { code: 'forbidden', message: 'Join the chat before sending' })
  }

  // Content validation
  if (msg.content !== undefined && typeof msg.content !== 'string') {
    return send(ws, 'error', { code: 'bad_request', message: 'Content must be a string' })
  }
  const content = (msg.content || '').trim()
  // Accept both 'attachmentIds' (documented) and 'attachments' (common alias)
  const attachmentIds: string[] = msg.attachmentIds ?? msg.attachments ?? []
  if (!content && attachmentIds.length === 0) {
    return send(ws, 'error', { code: 'bad_request', message: 'Cannot send empty message' })
  }
  if (content.length > 3000) {
    return send(ws, 'error', { code: 'bad_request', message: 'Message exceeds maximum length of 3000 characters' })
  }

  try {
    const payload = await getPayloadClient()
    // payload.create fires the afterChange hook (updateChatLastMessage) which calls
    // POST /internal/broadcast on THIS server to push the real-time event.
    const createdMsg = await (payload.create as any)({
      collection: 'chat-messages',
      data: {
        chat:        msg.chatId,
        content:     msg.content,
        attachments: attachmentIds,
        sender:      user.id,
      },
      req: { user: { id: user.id, roles: [user.role] } },
    })
    
    if (msg.tempId) {
      // Send message_ack back so the sender can replace their optimistic UI temp ID with the real DB ID
      const senderObj = typeof createdMsg.sender === 'object' && createdMsg.sender !== null ? createdMsg.sender : null
      const messagePayload = {
        id: createdMsg.id,
        content: createdMsg.content,
        sender: senderObj ? { id: senderObj.id, name: senderObj.name, email: senderObj.email } : createdMsg.sender,
        senderRole: createdMsg.senderRole,
        createdAt: createdMsg.createdAt,
        readBy: createdMsg.readBy || [],
        attachments: createdMsg.attachments || [],
      }
      send(ws, 'message_ack', { tempId: msg.tempId, message: messagePayload })
    }
  } catch (e: any) {
    console.error(`[Chat WS] handleSend error:`, e.message)
    send(ws, 'error', { code: 'send_failed', message: e.message })
  }
}

// ─── Mark read ────────────────────────────────────────────────────────────────
async function handleMarkRead(user: AuthedUser, chatId: string, messageIds?: string[]) {
  const payload = await getPayloadClient()
  let idsToMark = messageIds

  // Hot path: User opens chat, mark all unread automatically
  if (!Array.isArray(idsToMark) || idsToMark.length === 0) {
    const recentMessages = await payload.find({
      collection: 'chat-messages',
      where: {
        and: [
          { chat: { equals: chatId } },
          { sender: { not_equals: user.id } }
        ]
      },
      limit: 50,
      depth: 0,
      sort: '-createdAt'
    })
    
    const unreadDocs = recentMessages.docs.filter((msg: any) => 
      !(msg.readBy || []).some((r: any) => String(r.user) === String(user.id))
    )
    
    if (unreadDocs.length === 0) return

    // We already have the docs in memory, so skip N+1 reads and only do N updates
    await Promise.all(
      unreadDocs.map(async (msg: any) => {
        const readBy = msg.readBy || []
        await payload.update({
          collection: 'chat-messages',
          id: msg.id,
          data: { readBy: [...readBy, { user: user.id, readAt: new Date().toISOString() }] },
        })
      })
    )
    return broadcastToChat(chatId, 'read_receipt', { chatId, userId: user.id, messageIds: unreadDocs.map(m => m.id) })
  }

  // Fallback path: Explicit IDs provided
  if (idsToMark.length === 0) return
  
  // Single read to get all requested messages
  const messagesToUpdate = await payload.find({
    collection: 'chat-messages',
    where: { id: { in: idsToMark } },
    depth: 0,
    pagination: false
  })

  await Promise.all(
    messagesToUpdate.docs.map(async (msg: any) => {
      const readBy = msg.readBy || []
      if (!readBy.some((r: any) => String(r.user) === String(user.id))) {
        await payload.update({
          collection: 'chat-messages',
          id: msg.id,
          data: { readBy: [...readBy, { user: user.id, readAt: new Date().toISOString() }] },
        })
      }
    })
  )
  broadcastToChat(chatId, 'read_receipt', { chatId, userId: user.id, messageIds: idsToMark })
}

// ─── Disconnect ───────────────────────────────────────────────────────────────
function handleDisconnect(ws: WebSocket, user: AuthedUser) {
  userSockets.get(user.id)?.delete(ws)
  if (userSockets.get(user.id)?.size === 0) userSockets.delete(user.id)

  const meta = socketMeta.get(ws)
  const remainingSockets = userSockets.get(user.id)

  meta?.chatIds.forEach((chatId) => {
    const isStillInChat = remainingSockets && Array.from(remainingSockets).some((s) => socketMeta.get(s)?.chatIds.has(chatId))
    if (!isStillInChat) {
      chatRooms.get(chatId)?.delete(user.id)
      broadcastToChat(chatId, 'presence', { userId: user.id, online: false })
      if (chatRooms.get(chatId)?.size === 0) chatRooms.delete(chatId)
    }
  })

  // Clean up order rooms (preserve if user has another socket in the same room)
  meta?.orderIds.forEach((orderId) => {
    const isStillInOrder = remainingSockets && Array.from(remainingSockets).some((s) => socketMeta.get(s)?.orderIds.has(orderId))
    if (!isStillInOrder) {
      orderRooms.get(orderId)?.delete(user.id)
      if (orderRooms.get(orderId)?.size === 0) orderRooms.delete(orderId)
    }
  })

  // Clean up retailer / DP feeds
  if (meta?.isRetailerFeed) {
    retailerFeeds.get(user.id)?.delete(ws)
    if (retailerFeeds.get(user.id)?.size === 0) retailerFeeds.delete(user.id)
  }
  if (meta?.isDpFeed) {
    dpFeeds.get(user.id)?.delete(ws)
    if (dpFeeds.get(user.id)?.size === 0) dpFeeds.delete(user.id)
  }
}

// ─── Order Real-Time Handlers ──────────────────────────────────────────────────
function sanitizeOrderSnapshot(
  order: any,
  permissions?: {
    isCustomer?: boolean
    isRetailer?: boolean
    isDeliveryPartner?: boolean
    isAdmin?: boolean
  },
) {
  if (!order) return null

  const retailerObj =
    typeof order.retailer === 'object' && order.retailer !== null
      ? {
          id: order.retailer.id,
          shopName: order.retailer.shopName,
          mobileNumber: order.retailer.mobileNumber,
          shopAddress: order.retailer.shopAddress,
        }
      : order.retailer

  const dpObj =
    typeof order.deliveryPartner === 'object' && order.deliveryPartner !== null
      ? {
          id: order.deliveryPartner.id,
          fullName: order.deliveryPartner.fullName,
          mobileNumber: order.deliveryPartner.mobileNumber,
          vehicleType: order.deliveryPartner.vehicleType,
          vehicleRegistrationNumber: order.deliveryPartner.vehicleRegistrationNumber,
        }
      : order.deliveryPartner

  return {
    id: order.id,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    currency: order.currency || 'INR',
    items: order.items || [],
    retailer: retailerObj,
    deliveryPartner: dpObj,
    deliveryPartnerAcceptance: order.deliveryPartnerAcceptance,
    currentOfferedPartner: order.currentOfferedPartner
      ? typeof order.currentOfferedPartner === 'object'
        ? order.currentOfferedPartner.id
        : order.currentOfferedPartner
      : null,
    offerExpiresAt: order.offerExpiresAt,
    statusHistory: order.statusHistory || [],
    shippingAddress: order.shippingAddress,
    cancellationDetails: order.cancellationDetails,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // Sensitive OTPs only revealed to authorized roles
    pickupOTP: permissions?.isRetailer || permissions?.isAdmin ? order.pickupOTP : undefined,
    deliveryOTP: permissions?.isCustomer || permissions?.isAdmin ? order.deliveryOTP : undefined,
  }
}

async function handleJoinOrder(ws: WebSocket, user: AuthedUser, orderId: string) {
  if (!orderId) return send(ws, 'error', { code: 'missing_orderId', message: 'orderId is required' })

  try {
    const payload = await getPayloadClient()
    const order: any = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    if (!order) {
      return send(ws, 'error', { code: 'not_found', message: 'Order not found' })
    }

    const isAdmin = user.roles.includes('admin') || user.role === 'admin'
    const customerId =
      typeof order.customer === 'object' && order.customer ? order.customer.id : order.customer
    const isCustomer = Boolean(customerId && String(customerId) === String(user.id))

    let isRetailer = false
    const orderRetailerId =
      typeof order.retailer === 'object' && order.retailer ? order.retailer.id : order.retailer
    if (orderRetailerId) {
      const retDoc =
        typeof order.retailer === 'object' && order.retailer.user !== undefined
          ? order.retailer
          : ((await payload.findByID({ collection: 'retailers', id: orderRetailerId, depth: 0 })) as any)
      const retUserId =
        typeof retDoc?.user === 'object' && retDoc?.user ? retDoc.user.id : retDoc?.user
      if (retUserId && String(retUserId) === String(user.id)) isRetailer = true
    }

    let isDeliveryPartner = false
    const dpId =
      typeof order.deliveryPartner === 'object' && order.deliveryPartner
        ? order.deliveryPartner.id
        : order.deliveryPartner
    const offeredDpId =
      typeof order.currentOfferedPartner === 'object' && order.currentOfferedPartner
        ? order.currentOfferedPartner.id
        : order.currentOfferedPartner
    const targetDpId = dpId || offeredDpId

    if (targetDpId) {
      const dpDoc =
        typeof order.deliveryPartner === 'object' &&
        order.deliveryPartner?.id === targetDpId &&
        order.deliveryPartner.user !== undefined
          ? order.deliveryPartner
          : ((await payload.findByID({
              collection: 'delivery-partners',
              id: targetDpId,
              depth: 0,
            })) as any)
      const dpUserId =
        typeof dpDoc?.user === 'object' && dpDoc?.user ? dpDoc.user.id : dpDoc?.user
      if (dpUserId && String(dpUserId) === String(user.id)) isDeliveryPartner = true
    }

    if (!isAdmin && !isCustomer && !isRetailer && !isDeliveryPartner) {
      return send(ws, 'error', { code: 'forbidden', message: 'Not authorized for this order' })
    }

    socketMeta.get(ws)?.orderIds.add(orderId)
    if (!orderRooms.has(orderId)) orderRooms.set(orderId, new Set())
    orderRooms.get(orderId)!.add(user.id)

    send(ws, 'joined_order', { orderId, userId: user.id })

    // Immediate snapshot for live status (no polling needed by client)
    const snapshot = sanitizeOrderSnapshot(order, {
      isCustomer,
      isRetailer,
      isDeliveryPartner,
      isAdmin,
    })
    send(ws, 'order:snapshot', { orderId, order: snapshot })

    console.log(`[Order WS] ${user.id} joined order room ${orderId} | room size: ${orderRooms.get(orderId)!.size}`)
  } catch (err: any) {
    console.error(`[Order WS] handleJoinOrder error:`, err.message)
    return send(ws, 'error', { code: 'server_error', message: err.message })
  }
}

function handleLeaveOrder(ws: WebSocket, user: AuthedUser, orderId: string) {
  socketMeta.get(ws)?.orderIds.delete(orderId)
  const remainingSockets = userSockets.get(user.id)
  const isStillInOrder = remainingSockets && Array.from(remainingSockets).some((s) => socketMeta.get(s)?.orderIds.has(orderId))
  if (!isStillInOrder) {
    orderRooms.get(orderId)?.delete(user.id)
    if (orderRooms.get(orderId)?.size === 0) orderRooms.delete(orderId)
  }
  send(ws, 'left_order', { orderId, userId: user.id })
}

function handleJoinRetailerFeed(ws: WebSocket, user: AuthedUser) {
  const isRetailerOrAdmin =
    user.roles.includes('retailer') ||
    user.role === 'retailer' ||
    user.roles.includes('admin') ||
    user.role === 'admin'
  if (!isRetailerOrAdmin) {
    return send(ws, 'error', { code: 'forbidden', message: 'Only retailers can join retailer feed' })
  }

  if (!retailerFeeds.has(user.id)) retailerFeeds.set(user.id, new Set())
  retailerFeeds.get(user.id)!.add(ws)
  const meta = socketMeta.get(ws)
  if (meta) meta.isRetailerFeed = true

  send(ws, 'joined_retailer_feed', { userId: user.id })
  console.log(`[Order WS] Retailer ${user.id} joined retailer feed`)
}

function handleLeaveRetailerFeed(ws: WebSocket, user: AuthedUser) {
  retailerFeeds.get(user.id)?.delete(ws)
  if (retailerFeeds.get(user.id)?.size === 0) retailerFeeds.delete(user.id)
  const meta = socketMeta.get(ws)
  if (meta) meta.isRetailerFeed = false
  send(ws, 'left_retailer_feed', { userId: user.id })
}

function handleJoinDpFeed(ws: WebSocket, user: AuthedUser) {
  const isDpOrAdmin =
    user.roles.includes('delivery_partner') ||
    user.role === 'delivery_partner' ||
    user.roles.includes('admin') ||
    user.role === 'admin'
  if (!isDpOrAdmin) {
    return send(ws, 'error', { code: 'forbidden', message: 'Only delivery partners can join DP feed' })
  }

  if (!dpFeeds.has(user.id)) dpFeeds.set(user.id, new Set())
  dpFeeds.get(user.id)!.add(ws)
  const meta = socketMeta.get(ws)
  if (meta) meta.isDpFeed = true

  send(ws, 'joined_dp_feed', { userId: user.id })
  console.log(`[Order WS] DP ${user.id} joined DP feed`)
}

function handleLeaveDpFeed(ws: WebSocket, user: AuthedUser) {
  dpFeeds.get(user.id)?.delete(ws)
  if (dpFeeds.get(user.id)?.size === 0) dpFeeds.delete(user.id)
  const meta = socketMeta.get(ws)
  if (meta) meta.isDpFeed = false
  send(ws, 'left_dp_feed', { userId: user.id })
}

function broadcastOrderEvent({
  orderId,
  targetUserIds,
  type,
  payload,
  excludeUserId,
}: {
  orderId?: string
  targetUserIds?: string[]
  type: string
  payload: any
  excludeUserId?: string
}) {
  const socketsToSend = new Set<WebSocket>()

  // 1. All users currently in orderRoom
  if (orderId && orderRooms.has(orderId)) {
    const userIds = orderRooms.get(orderId)!
    userIds.forEach((uid) => {
      if (uid === excludeUserId) return
      const socks = userSockets.get(uid)
      if (socks) socks.forEach((sock) => socketsToSend.add(sock))
    })
  }

  // 2. All targetUserIds (direct send / feed recipients)
  if (Array.isArray(targetUserIds)) {
    targetUserIds.forEach((uid) => {
      if (!uid || uid === excludeUserId) return
      const socks = userSockets.get(String(uid))
      if (socks) socks.forEach((sock) => socketsToSend.add(sock))
    })
  }

  let sent = 0
  socketsToSend.forEach((sock) => {
    send(sock, type, payload)
    sent++
  })

  if (sent > 0) {
    console.log(`[Order WS] Broadcast "${type}" to ${sent} socket(s) (orderId=${orderId || 'none'})`)
  }
}

// ─── Broadcast ────────────────────────────────────────────────────────────────
function broadcastToChat(chatId: string, type: string, payload: any, excludeUserId?: string) {
  const userIds = chatRooms.get(chatId)
  if (!userIds) return
  let sent = 0
  userIds.forEach((userId) => {
    if (userId === excludeUserId) return
    userSockets.get(userId)?.forEach((sock) => {
      send(sock, type, payload)
      sent++
    })
  })
  if (sent > 0) console.log(`[Chat WS] Broadcast "${type}" to ${sent} socket(s) in room ${chatId}`)
}

function isUserOnline(userId: string) {
  return (userSockets.get(userId)?.size ?? 0) > 0
}

function send(ws: WebSocket, type: string, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }))
  }
}

// ─── HTTP server (WS upgrades + internal API) ─────────────────────────────────
const server = createServer((req, res) => {
  // ── Health check ──────────────────────────────────────────────────────────
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      onlineUsers:   userSockets.size,
      chatRooms:     chatRooms.size,
      orderRooms:    orderRooms.size,
      retailerFeeds: retailerFeeds.size,
      dpFeeds:       dpFeeds.size,
    }))
    return
  }

  // ── Online check — called by Payload hook to decide whether to send FCM push ─
  if (req.url?.startsWith('/internal/online') && req.method === 'GET') {
    if (req.headers.authorization !== `Internal ${INTERNAL_SECRET}`) {
      res.writeHead(403).end('Forbidden')
      return
    }
    const userId = new URL(req.url, 'http://localhost').searchParams.get('userId') || ''
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ online: isUserOnline(userId) }))
    return
  }

  // ── Chat Broadcast — called by ChatMessages afterChange hook ───────────────
  if (req.url === '/internal/broadcast' && req.method === 'POST') {
    if (req.headers.authorization !== `Internal ${INTERNAL_SECRET}`) {
      res.writeHead(403).end('Forbidden')
      return
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const { chatId, type, payload, excludeUserId } = JSON.parse(body)
        broadcastToChat(chatId, type, payload, excludeUserId)
        res.writeHead(200).end('ok')
      } catch {
        res.writeHead(400).end('bad json')
      }
    })
    return
  }

  // ── Order Broadcast — called by Orders triggerOrderWsEvents hook ───────────
  if (req.url === '/internal/broadcast-order' && req.method === 'POST') {
    if (req.headers.authorization !== `Internal ${INTERNAL_SECRET}`) {
      res.writeHead(403).end('Forbidden')
      return
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const { orderId, targetUserIds, type, payload, excludeUserId } = JSON.parse(body)
        broadcastOrderEvent({ orderId, targetUserIds, type, payload, excludeUserId })
        res.writeHead(200).end('ok')
      } catch {
        res.writeHead(400).end('bad json')
      }
    })
    return
  }

  res.writeHead(404).end('Not found')
})

// ─── WebSocket upgrade ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true })

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) {
      console.log(`[Chat WS] Terminating dead socket`)
      return ws.terminate() // This instantly triggers ws.on('close') which calls handleDisconnect!
    }
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(pingInterval)
})

server.on('upgrade', async (req, socket, head) => {
  console.log(`[Chat WS] Upgrade from ${req.socket.remoteAddress}`)
  const user = await handleAuth(req)
  if (!user) {
    socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n')
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    handleConnection(ws, user)
  })
})

wss.on('error', (err) => console.error('[Chat WS] WSS error:', err))

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  console.log('[Chat WS] Initializing Payload...')
  await getPayloadClient()  // warm up the Payload + DB connection before accepting connections
  server.listen(PORT, () => {
    console.log(`[WS] ✓ WebSocket service ready on port ${PORT}`)
    console.log(`[WS]   ws://localhost:${PORT}                    ← client connections`)
    console.log(`[WS]   http://localhost:${PORT}/health           ← health check`)
    console.log(`[WS]   http://localhost:${PORT}/internal/broadcast       ← chat broadcast hook`)
    console.log(`[WS]   http://localhost:${PORT}/internal/broadcast-order ← order broadcast hook`)
  })
}

start().catch((err) => {
  console.error('[Chat WS] Fatal startup error:', err)
  process.exit(1)
})
