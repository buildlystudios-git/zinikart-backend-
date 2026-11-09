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

// App & URLs
export const PREVIEW_SECRET = process.env.PREVIEW_SECRET || ''
export const ASSIGNMENT_STRATEGY = process.env.ASSIGNMENT_STRATEGY || 'background_job'
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const NEXT_PUBLIC_NODE_ENV = process.env.NEXT_PUBLIC_NODE_ENV || ''
export const IS_PROD = NODE_ENV === 'production' || NEXT_PUBLIC_NODE_ENV === 'production'
export const SEED_PRODUCT_COUNT = process.env.SEED_PRODUCT_COUNT || '0'
export const PAYLOAD_PUBLIC_SERVER_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
export const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
export const NEXT_PUBLIC_VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL || ''
export const VERCEL_PROJECT_PRODUCTION_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL || ''

// WebSocket Service
export const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10)
export const WS_INTERNAL_URL = process.env.WS_INTERNAL_URL || 'http://localhost:3001'
export const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'dev-ws-internal-secret'
export const NEXT_PUBLIC_CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:3001'

// Mobile & Auth
export const MOBILE_API_KEY = process.env.MOBILE_API_KEY || ''
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || ''
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || ''

// Branding & Metadata
export const COMPANY_NAME = process.env.COMPANY_NAME || ''
export const SITE_NAME = process.env.SITE_NAME || ''
export const TWITTER_CREATOR = process.env.TWITTER_CREATOR || ''
export const TWITTER_SITE = process.env.TWITTER_SITE || ''

// Timeouts (configurable)
export const RIDER_OFFER_TIMEOUT_MS = parseInt(process.env.RIDER_OFFER_TIMEOUT_MS || '60000', 10)
export const RETAILER_ACTION_TIMEOUT_MS = parseInt(process.env.RETAILER_ACTION_TIMEOUT_MS || '300000', 10)
export const LOCATION_THROTTLE_MS = parseInt(process.env.LOCATION_THROTTLE_MS || '10000', 10)

// S3 Storage
export const S3_BUCKET = process.env.S3_BUCKET || ''
export const S3_REGION = process.env.S3_REGION || ''
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ''
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ''
export const S3_ENDPOINT = process.env.S3_ENDPOINT || ''
