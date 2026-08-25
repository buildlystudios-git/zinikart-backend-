import type { CollectionAfterChangeHook } from 'payload'

export const resolveMetadata: CollectionAfterChangeHook = async ({ req, doc, previousDoc, operation, context }) => {
  if (operation === 'update' && !context.skipResolveMetadata) {
    if (doc.status === 'resolved' && previousDoc.status !== 'resolved') {
      await req.payload.update({
        collection: 'support-chats',
        id: doc.id,
        data: {
          resolvedAt: new Date().toISOString(),
          resolvedBy: req.user?.id,
        },
        context: { skipResolveMetadata: true },
        req, // pass req to maintain transaction
      })
    }
  }
  return doc
}
