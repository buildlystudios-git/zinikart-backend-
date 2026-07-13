import { TaskHandler } from 'payload'

export const pruneTokensTaskHandler: TaskHandler<'pruneTokens'> = async ({ req, input }) => {
  const { recipientUserId, invalidTokens } = input as {
    recipientUserId: string
    invalidTokens: string[]
  }
  
  const payload = req.payload

  if (!invalidTokens || invalidTokens.length === 0) {
    return { output: { success: true, prunedCount: 0 } }
  }

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: recipientUserId,
      depth: 0,
      req,
    })

    if (user && user.fcmTokens) {
      const filteredTokens = user.fcmTokens.filter((t: any) => !invalidTokens.includes(t.token))
      
      await payload.update({
        collection: 'users',
        id: recipientUserId,
        data: {
          fcmTokens: filteredTokens,
        },
        req,
      })
      
      return { output: { success: true, prunedCount: invalidTokens.length } }
    }
    
    return { output: { success: true, prunedCount: 0 } }
  } catch (error) {
    // We don't throw here. We don't want to retry the whole workflow just for pruning failure.
    // Wrap in warning.
    payload.logger.warn(`Failed to prune dead tokens for user ${recipientUserId}: ${error}`)
    return { output: { success: false, error: String(error) } }
  }
}
