import type { Endpoint } from 'payload'

export const rateChatEndpoint: Endpoint = {
  path: '/:id/rate',
  method: 'post',
  handler: async (req) => {
    try {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const chatId = req.routeParams?.id as string
      if (!chatId) {
        return Response.json({ error: 'Missing chat ID' }, { status: 400 })
      }

      const body = typeof req.json === 'function' ? await req.json() : (req as any).body
      const { score, comment } = body || {}

      if (typeof score !== 'number' || score < 1 || score > 5) {
        return Response.json({ error: 'Invalid score, must be between 1 and 5' }, { status: 400 })
      }

      const chat = await req.payload.findByID({
        collection: 'support-chats',
        id: chatId,
        depth: 0,
        req,
      })

      if (!chat) {
        return Response.json({ error: 'Chat not found' }, { status: 404 })
      }

      // Check if user is the initiator
      if (chat.initiator !== req.user.id) {
        return Response.json({ error: 'Only the initiator can rate the chat' }, { status: 403 })
      }

      if (chat.rating?.score) {
        return Response.json({ error: 'Chat has already been rated' }, { status: 400 })
      }

      const updatedChat = await req.payload.update({
        collection: 'support-chats',
        id: chatId,
        data: {
          rating: {
            score,
            comment,
            ratedBy: req.user.id,
            ratedAt: new Date().toISOString(),
          },
        },
        req,
      })

      return Response.json({ success: true, rating: updatedChat.rating })
    } catch (error: any) {
      return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
  },
}
