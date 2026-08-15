'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'
import Link from 'next/link'
import { SectionCard } from '../ui/SectionCard'
import { SelectField } from '../ui/SelectField'
import styles from './ChatEditView.module.css'

const getStatusColorClass = (status: string) => {
  switch (status) {
    case 'resolved':
      return styles.statusGreen
    case 'open':
      return styles.statusBlue
    case 'pending':
      return styles.statusYellow
    case 'closed':
      return styles.statusGray
    default:
      return styles.statusGray
  }
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

export default function ChatEditView() {
  const pathname = usePathname()
  const router = useRouter()
  const { setStepNav } = useStepNav()
  
  // Extract ID from pathname: /admin/collections/support-chats/[id]
  const pathParts = (pathname || '').split('/')
  const idStr = pathParts[pathParts.length - 1]
  const isEditing = idStr && idStr !== 'create'
  const chatId = isEditing ? idStr : null

  const [isLoading, setIsLoading] = useState(isEditing)
  const [chat, setChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [status, setStatus] = useState<string>('open')
  const [isOnline, setIsOnline] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  // Use a ref for chat data to avoid stale closure in onmessage
  const chatRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    isUnmountedRef.current = false
    if (chatId) {
      fetchChatData()
    } else {
      setIsLoading(false)
      updateBreadcrumbs('New Chat')
    }
    return () => {
      isUnmountedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [chatId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const updateBreadcrumbs = (title: string) => {
    setStepNav([
      { label: 'Support Chats', url: '/admin/collections/support-chats' },
      { label: title, url: '' }
    ])
  }

  const fetchChatData = async () => {
    try {
      const chatRes = await fetch(`/api/support-chats/${chatId}?depth=1&t=${Date.now()}`)
      if (chatRes.ok) {
        const chatData = await chatRes.json()
        chatRef.current = chatData  // Store in ref for closure-safe access
        setChat(chatData)
        setStatus(chatData.status || 'open')
        updateBreadcrumbs(chatData.heading)
        
        // Connect WS — pass chatData directly so initWebSocket doesn't rely on stale state
        if (chatId) {
          initWebSocket(chatId, chatData)
        }
      }

      const msgRes = await fetch(`/api/chat-messages?where[chat][equals]=${chatId}&limit=100&sort=createdAt&depth=1`)
      if (msgRes.ok) {
        const msgData = await msgRes.json()
        setMessages(msgData.docs || [])
      }
    } catch (err) {
      console.error('Error fetching chat:', err)
      toast.error('Failed to load chat data')
    } finally {
      setIsLoading(false)
    }
  }

  const initWebSocket = (cid: string, chatData?: any) => {
    // Close any existing connection first
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.onclose = null  // Prevent reconnect loop on intentional close
      wsRef.current.close()
    }

    // Standalone WS service on port 3001 (configurable via NEXT_PUBLIC_CHAT_WS_URL)
    const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Admin WS] Connected')
      setWsConnected(true)
      ws.send(JSON.stringify({ type: 'join_chat', chatId: cid }))
      
      // Auto mark read for all unread messages when opening the chat
      if (document.hasFocus()) {
        ws.send(JSON.stringify({ type: 'mark_read', chatId: cid }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[Admin WS] Message:', data)

        if (data.type === 'joined') {
          console.log('[Admin WS] Successfully joined chat', cid)
        } else if (data.type === 'message_new') {
          setMessages(prev => {
            if (prev.find(m => m.id === data.message.id)) return prev
            return [...prev, data.message]
          })
          
          // If we receive a message from the customer, mark it as read immediately
          // Condition: Only mark as read if the Admin actually has the window focused!
          if (data.message.senderRole !== 'admin' && wsRef.current?.readyState === WebSocket.OPEN && document.hasFocus()) {
            wsRef.current.send(JSON.stringify({
              type: 'mark_read',
              chatId: cid
            }))
          }
        } else if (data.type === 'message_ack') {
          // This replaces our optimistic "temp-" message with the real DB message
          setMessages(prev => {
            const tempIndex = prev.findIndex(m => m.id === data.tempId)
            if (tempIndex !== -1) {
              const newMessages = [...prev]
              newMessages[tempIndex] = data.message
              return newMessages
            }
            return prev
          })
        } else if (data.type === 'typing') {
          // If userId is different from current user, show typing indicator
          setIsOtherTyping(data.isTyping)
        } else if (data.type === 'read_receipt') {
          // Update local messages to show they were read
          setMessages(prev => prev.map(m => {
            if (data.messageIds.includes(m.id)) {
              return { ...m, readBy: [...(m.readBy || []), { user: 'customer', readAt: new Date().toISOString() }] }
            }
            return m
          }))
        } else if (data.type === 'presence') {
          // Use chatRef.current instead of chat to avoid stale closure
          const currentChat = chatRef.current
          const initiatorId = typeof currentChat?.initiator === 'object'
            ? currentChat?.initiator?.id
            : currentChat?.initiator
          if (initiatorId && data.userId === initiatorId) {
            setIsOnline(data.online)
          }
        } else if (data.type === 'error') {
          console.error('[Admin WS] Server error:', data)
        }
      } catch (e) {
        console.error('[Admin WS] Parse error', e)
      }
    }

    ws.onerror = () => {
      // WS service may not be running yet — onclose fires next and triggers auto-reconnect
      console.warn('[Admin WS] Connection error (is pnpm run chat running on port 3001?)')
    }

    ws.onclose = (event) => {
      console.log('[Admin WS] Disconnected, code:', event.code)
      setWsConnected(false)
      setIsOnline(false)

      // Auto-reconnect unless the component was unmounted
      if (!isUnmountedRef.current) {
        console.log('[Admin WS] Reconnecting in 3s...')
        reconnectTimerRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            initWebSocket(cid, chatRef.current)
          }
        }, 3000)
      }
    }
  }

  // Handle window focus to catch up on read receipts
  useEffect(() => {
    const handleFocus = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN && chatId) {
        wsRef.current.send(JSON.stringify({ type: 'mark_read', chatId }))
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [chatId])

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    try {
      const res = await fetch(`/api/support-chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        toast.success('Status updated')
      } else {
        toast.error('Failed to update status')
      }
    } catch (e) {
      toast.error('Network error')
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !chatId) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('WebSocket not connected. Reconnecting...')
      return
    }
    setIsSending(true)
    try {
      const content = inputText.trim()
      const tempId = 'temp-' + Date.now()
      
      // Optimistic update: the server won't broadcast our own message back to us
      const optimisticMsg = {
        id: tempId,
        content,
        senderRole: 'admin',
        createdAt: new Date().toISOString(),
        sender: { name: 'Admin (You)' }
      }
      setMessages(prev => [...prev, optimisticMsg])
      
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        chatId,
        content,
        tempId // Include tempId so the server can ack it back
      }))
      // Stop typing indicator
      wsRef.current.send(JSON.stringify({ type: 'typing_stop', chatId }))
      setInputText('')
    } catch (e) {
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (wsRef.current?.readyState === WebSocket.OPEN && chatId) {
      if (val.trim() && !inputText.trim()) {
        wsRef.current.send(JSON.stringify({ type: 'typing_start', chatId }))
      } else if (!val.trim() && inputText.trim()) {
        wsRef.current.send(JSON.stringify({ type: 'typing_stop', chatId }))
      }
    }
    setInputText(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader2 className={styles.spinner} size={48} color="#9ca3af" />
      </div>
    )
  }

  if (!chat && isEditing) {
    return <div style={{ padding: '40px' }}>Chat not found.</div>
  }

  if (!isEditing) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Create Support Chat</h1>
        <p style={{ marginTop: '16px' }}>Chats are typically initiated by users on the client side.</p>
      </div>
    )
  }

  const initiator = typeof chat.initiator === 'object' ? chat.initiator : null
  const order = typeof chat.order === 'object' ? chat.order : null

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{chat.heading}</h1>
          <span className={`${styles.statusBadge} ${getStatusColorClass(chat.status)}`}>
            {chat.status || 'open'}
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={`${styles.presenceDot} ${isOnline ? styles.presenceOnline : ''}`}></span>
              {initiator?.name || initiator?.email || 'Unknown'} is {isOnline ? 'online' : 'offline'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: wsConnected ? '#16a34a' : '#dc2626' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: wsConnected ? '#16a34a' : '#dc2626', display: 'inline-block' }}></span>
              {wsConnected ? 'Live' : 'Reconnecting...'}
            </span>
          </span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancelBtn} onClick={() => router.push('/admin/collections/support-chats')} type="button">
            Back to Chats
          </button>
        </div>
      </header>

      <div className={styles.content}>
        
        {/* Chat History & Input */}
        <div className={styles.bentoChat}>
          <div className={styles.chatHistory} ref={scrollRef}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px' }}>
                No messages yet.
              </div>
            )}
            {messages.map((msg, idx) => {
              const isAdminMsg = msg.senderRole === 'admin'
              const sender = typeof msg.sender === 'object' ? msg.sender : null
              const senderName = isAdminMsg ? (sender?.name || 'Admin') : (sender?.name || 'User')
              
              return (
                <div key={msg.id || idx} className={`${styles.messageRow} ${isAdminMsg ? styles.messageRowAdmin : styles.messageRowUser}`}>
                  <div className={`${styles.messageBubble} ${isAdminMsg ? styles.bubbleAdmin : styles.bubbleUser}`}>
                    {msg.content}
                    <div className={styles.msgFooter}>
                      <span className={styles.msgTime}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isAdminMsg && msg.readBy?.length > 0 && (
                        <span style={{ color: '#3b82f6', fontSize: '12px' }}>✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {isOtherTyping && (
              <div className={styles.typingIndicator}>
                Customer is typing...
              </div>
            )}
          </div>
          
          <div className={styles.chatInputArea}>
            <textarea 
              className={styles.chatInput}
              placeholder="Type your message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <button className={styles.sendBtn} onClick={handleSendMessage} disabled={isSending || !inputText.trim()}>
              {isSending ? <Loader2 className={styles.spinner} size={16} /> : <Send size={16} />}
              Send
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className={styles.bentoSidebar}>
          
          <SectionCard title="Chat Details">
            <div className={styles.dataList}>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Status</span>
                <div style={{ marginTop: '4px' }}>
                  <SelectField 
                    label=""
                    options={[
                      { label: 'Open', value: 'open' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Resolved', value: 'resolved' },
                      { label: 'Closed', value: 'closed' },
                    ]}
                    value={status}
                    onChange={handleStatusChange}
                  />
                </div>
              </div>
              
              <div className={styles.dataGroup} style={{ marginTop: '12px' }}>
                <span className={styles.dataLabel}>Type</span>
                <span className={styles.dataValue} style={{ textTransform: 'capitalize' }}>
                  {chat.type?.replace(/_/g, ' ') || 'Unknown'}
                </span>
              </div>
              
              {order && (
                <div className={styles.dataGroup} style={{ marginTop: '12px' }}>
                  <span className={styles.dataLabel}>Linked Order</span>
                  <Link 
                    href={`/admin/collections/orders/${order.id}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                  >
                    #{order.id}
                  </Link>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Initiator Info">
            <div className={styles.dataList}>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Name</span>
                <span className={styles.dataValue}>{initiator?.name || 'Guest User'}</span>
              </div>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Email</span>
                <span className={styles.dataValue}>{initiator?.email || 'N/A'}</span>
              </div>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>User Role</span>
                <span className={styles.dataValue} style={{ textTransform: 'capitalize' }}>
                  {chat.initiatorType?.replace(/_/g, ' ') || 'Unknown'}
                </span>
              </div>
            </div>
          </SectionCard>

          {chat.rating && chat.rating.score && (
            <SectionCard title="Rating">
              <div className={styles.dataList}>
                <div className={styles.dataGroup}>
                  <span className={styles.dataLabel}>Score</span>
                  <span className={styles.dataValue}>{'⭐'.repeat(chat.rating.score)}</span>
                </div>
                {chat.rating.comment && (
                  <div className={styles.dataGroup}>
                    <span className={styles.dataLabel}>Comment</span>
                    <span className={styles.dataSubValue}>{chat.rating.comment}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  )
}
