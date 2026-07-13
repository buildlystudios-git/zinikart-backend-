import { CollectionAfterChangeHook } from 'payload'

export const notifyApprovalStatus = (role: 'retailer' | 'delivery partner'): CollectionAfterChangeHook => {
  return async ({ doc, previousDoc, req }) => {
    const payload = req.payload

    if (doc.approvalStatus !== previousDoc?.approvalStatus) {
      const userId = typeof doc.user === 'object' && doc.user ? doc.user.id : doc.user
      
      if (userId) {
        if (doc.approvalStatus === 'approved') {
          await payload.jobs.queue({
            workflow: 'dispatchPushNotification',
            input: {
              recipientUserId: userId,
              templateKey: 'ACCOUNT_APPROVED',
              templateData: { role },
            }
          })
        } else if (doc.approvalStatus === 'rejected') {
          await payload.jobs.queue({
            workflow: 'dispatchPushNotification',
            input: {
              recipientUserId: userId,
              templateKey: 'ACCOUNT_REJECTED',
              templateData: { role },
            }
          })
        }
      }
    }

    return doc
  }
}
