import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from '@/constants/env'

export const initFirebase = () => {
  if (!getApps().length) {
    try {
      if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        initializeApp({
          credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        })
        console.log('Firebase Admin initialized successfully.')
      } else {
        console.warn('Firebase configuration missing. Push notifications will not work.')
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error)
    }
  }
}

export const getFirebaseMessaging = () => {
  return getApps().length > 0 ? getMessaging() : null
}
