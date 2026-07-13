import { TaskHandler } from 'payload'

export const writeNotificationLogTaskHandler: TaskHandler<'writeNotificationLog'> = async ({ req, input }) => {
  const {
    recipientUserId,
    templateKey,
    notificationTitle,
    notificationBody,
    successCount,
    failureCount,
  } = input as {
    recipientUserId: string
    templateKey: string
    notificationTitle: string
    notificationBody: string
    successCount: number
    failureCount: number
  }
  
  const payload = req.payload

  try {
    const status = (failureCount > 0 && successCount === 0) ? 'failed' : 'sent'
    
    await payload.create({
      collection: 'push-notification-logs',
      data: {
        recipient: recipientUserId,
        title: notificationTitle || 'No Title',
        body: notificationBody || 'No Body',
        data: { templateKey },
        status,
        sentAt: new Date().toISOString(),
      },
      req,
    })

    return { output: { success: true, logCreated: true } }
  } catch (error) {
    // We don't throw here to avoid workflow retry loops just for logging failure.
    payload.logger.warn(`Failed to write push notification log for user ${recipientUserId}: ${error}`)
    return { output: { success: false, error: String(error) } }
  }
}
