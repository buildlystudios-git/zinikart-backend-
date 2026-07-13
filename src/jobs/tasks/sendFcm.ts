import { TaskHandler } from 'payload'
import { buildMessageBase, sendToTokens } from '@/services/notifications/fcm'
import { NotificationTemplateKey } from '@/constants/notificationTemplates'
import type { Message } from 'firebase-admin/messaging'

export const sendFcmTaskHandler: TaskHandler<'sendFcm'> = async ({ req, input }) => {
  const { recipientUserId, templateKey, templateData } = input as {
    recipientUserId: string
    templateKey: NotificationTemplateKey
    templateData: Record<string, string>
  }
  
  const payload = req.payload

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: recipientUserId,
      depth: 0,
      req,
    })

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { output: { success: true, successCount: 0, failureCount: 0, invalidTokens: [], notificationTitle: '', notificationBody: '' } }
    }

    const tokens = user.fcmTokens.map((t: any) => t.token)
    
    const messageBase = buildMessageBase(templateKey, templateData)

    const result = await sendToTokens(tokens, messageBase)

    return { 
      output: { 
        success: true,
        successCount: result.successCount,
        failureCount: result.failureCount,
        invalidTokens: result.invalidTokens,
        notificationTitle: messageBase.notification?.title || '',
        notificationBody: messageBase.notification?.body || '',
      } 
    }
  } catch (error) {
    // If FCM call completely fails (e.g., network error), throw to trigger Payload retry
    payload.logger.error(`Error in sendFcm task for user ${recipientUserId}: ${error}`)
    throw error
  }
}
