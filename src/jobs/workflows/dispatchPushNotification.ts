import { WorkflowHandler } from 'payload'
import { NotificationTemplateKey } from '@/constants/notificationTemplates'

export const dispatchPushNotificationWorkflow: WorkflowHandler<'dispatchPushNotification'> = async ({ job, tasks }) => {
  const { recipientUserId, templateKey, templateData } = job.input as {
    recipientUserId: string
    templateKey: NotificationTemplateKey
    templateData: Record<string, string>
  }
  
  // Step 1: Send FCM push (retries managed at task level in payload.config.ts)
  const sendResult = await tasks.sendFcm('send-fcm-step', {
    input: {
      recipientUserId,
      templateKey,
      templateData,
    }
  })

  // If no output, something went wrong, or no tokens found
  if (!sendResult || !(sendResult as any).successCount && !(sendResult as any).failureCount) return

  const { invalidTokens, successCount, failureCount, messageBase } = sendResult as any

  // Step 2: Prune invalid tokens (if any)
  if (invalidTokens && invalidTokens.length > 0) {
    await tasks.pruneTokens('prune-tokens-step', {
      input: {
        recipientUserId,
        invalidTokens,
      }
    })
  }

  // Step 3: Log notification
  await tasks.writeNotificationLog('write-log-step', {
    input: {
      recipientUserId,
      templateKey,
      successCount: successCount || 0,
      failureCount: failureCount || 0,
      notificationBody: (messageBase as any)?.notification?.body || '',
      notificationTitle: (messageBase as any)?.notification?.title || '',
    }
  })
}
