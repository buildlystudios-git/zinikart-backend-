import { Payload } from 'payload'

export const claimFcmToken = async (
  token: string,
  platform: 'android' | 'ios' | 'web',
  deviceLabel: string | undefined,
  currentUserId: string,
  payload: Payload
) => {
  // 1. Find all users who have this token in their array (excluding current user)
  const staleUsers = await payload.find({
    collection: 'users',
    where: {
      and: [
        {
          id: {
            not_equals: currentUserId,
          },
        },
        {
          'fcmTokens.token': {
            equals: token,
          },
        },
      ],
    },
    depth: 0,
  })

  // 2. Strip token from stale users
  for (const staleUser of staleUsers.docs) {
    if (staleUser.fcmTokens) {
      const filteredTokens = staleUser.fcmTokens.filter((t: any) => t.token !== token)
      await payload.update({
        collection: 'users',
        id: staleUser.id,
        data: {
          fcmTokens: filteredTokens,
        },
      })
    }
  }

  // 3. Add to current user if not already present
  const currentUser = await payload.findByID({
    collection: 'users',
    id: currentUserId,
    depth: 0,
  })

  const existingTokens = currentUser.fcmTokens || []
  const tokenExists = existingTokens.some((t: any) => t.token === token)

  if (!tokenExists) {
    await payload.update({
      collection: 'users',
      id: currentUserId,
      data: {
        fcmTokens: [
          ...existingTokens,
          {
            token,
            platform,
            deviceLabel,
            registeredAt: new Date().toISOString(),
          },
        ],
      },
    })
  }
}
