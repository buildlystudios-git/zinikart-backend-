import { Endpoint } from 'payload'
import { isAuthenticated } from '@/access/isAuthenticated'
import { claimFcmToken } from '@/services/notifications/claimToken'

export const registerFcmToken: Endpoint = {
  path: '/fcm-token',
  method: 'post',
  handler: async (req) => {
    const { user, payload } = req
    
    if (!isAuthenticated({ req } as any)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json!()
    const { token, platform, deviceLabel } = body as {
      token: string
      platform: 'android' | 'ios' | 'web'
      deviceLabel?: string
    }

    if (!token || !platform) {
      return Response.json({ error: 'Token and platform are required' }, { status: 400 })
    }

    try {
      await claimFcmToken(token, platform, deviceLabel, user!.id, payload)
      return Response.json({ success: true, message: 'Token registered successfully' })
    } catch (error) {
      payload.logger.error(`Error registering FCM token: ${error}`)
      return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}

export const unregisterFcmToken: Endpoint = {
  path: '/fcm-token',
  method: 'delete',
  handler: async (req) => {
    const { user, payload } = req
    
    if (!isAuthenticated({ req } as any) || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json!()
    const { token } = body as { token: string }

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 })
    }

    try {
      // If the user has this token, remove it. We must refetch user to get up to date tokens
      const currentUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
        req,
      })

      if (currentUser.fcmTokens) {
        const filteredTokens = currentUser.fcmTokens.filter((t: any) => t.token !== token)
        
        if (filteredTokens.length !== currentUser.fcmTokens.length) {
          await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              fcmTokens: filteredTokens,
            },
            req,
          })
        }
      }
      
      return Response.json({ success: true, message: 'Token unregistered successfully' })
    } catch (error) {
      payload.logger.error(`Error unregistering FCM token: ${error}`)
      return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }
}
