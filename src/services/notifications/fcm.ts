import { getFirebaseMessaging } from '@/lib/firebase'
import { NOTIFICATION_TEMPLATES, NotificationTemplateKey } from '@/constants/notificationTemplates'
import type { Message } from 'firebase-admin/messaging'

export const buildMessageBase = (
  templateKey: NotificationTemplateKey,
  data: Record<string, string>,
): Omit<Message, 'token'> => {
  const template = NOTIFICATION_TEMPLATES[templateKey]
  
  let body: string = template.body
  for (const [key, value] of Object.entries(data)) {
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  const messageBase: Omit<Message, 'token'> = {
    notification: {
      title: template.title,
      body,
    },
    data: {
      ...data,
      type: templateKey,
    },
    android: {
      priority: 'high',
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          ...(templateKey === 'DELIVERY_OFFER' && { 'interruption-level': 'time-sensitive' }),
        },
      },
    },
  }

  return messageBase
}

export const sendToTokens = async (tokens: string[], messageBase: Omit<Message, 'token'>) => {
  const messaging = getFirebaseMessaging()
  if (!messaging) {
    throw new Error('Firebase Admin not initialized')
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] }
  }

  try {
    const response = await messaging.sendEachForMulticast({
      ...messageBase,
      tokens,
    })

    const invalidTokens: string[] = []
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        if (
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx])
        }
      }
    })

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    }
  } catch (error) {
    throw error
  }
}
