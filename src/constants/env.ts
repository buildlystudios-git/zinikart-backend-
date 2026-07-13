// Payment providers
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_KEY_ID || ''
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_API_SECRET || process.env.RAZORPAY_KEY_SECRET || ''
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOKS_SIGNING_SECRET || ''
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock'
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET || 'whsec_mock'

// Twilio
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
export const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || ''

// Database & Payload
export const DATABASE_URL = process.env.DATABASE_URL || ''
export const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || ''

// App
export const PREVIEW_SECRET = process.env.PREVIEW_SECRET || ''
export const ASSIGNMENT_STRATEGY = process.env.ASSIGNMENT_STRATEGY || 'background_job'

// Timeouts (configurable)
export const RIDER_OFFER_TIMEOUT_MS = parseInt(process.env.RIDER_OFFER_TIMEOUT_MS || '60000', 10)
export const RETAILER_ACTION_TIMEOUT_MS = parseInt(process.env.RETAILER_ACTION_TIMEOUT_MS || '300000', 10)
export const LOCATION_THROTTLE_MS = parseInt(process.env.LOCATION_THROTTLE_MS || '10000', 10)

// Firebase & Notifications
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || ''
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || ''
export const SLACK_OPS_WEBHOOK_URL = process.env.SLACK_OPS_WEBHOOK_URL || ''
