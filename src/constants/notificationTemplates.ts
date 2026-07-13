export const NOTIFICATION_TEMPLATES = {
  // Order lifecycle — customer
  ORDER_PLACED:              { title: 'Order Confirmed! 🎉', body: 'Order #{{orderId}} placed. The retailer will confirm shortly.' },
  ORDER_RECEIVED:            { title: 'Retailer Confirmed ✅', body: 'Your order #{{orderId}} is confirmed and being prepared.' },
  ORDER_OUT_FOR_DELIVERY:    { title: 'Out for Delivery 🛵', body: 'Your order #{{orderId}} is on its way!' },
  ORDER_DELIVERED:           { title: 'Delivered! 🎁', body: 'Order #{{orderId}} delivered. Enjoy!' },
  ORDER_CANCELLED_TIMEOUT:   { title: 'Order Auto-Cancelled', body: 'Order #{{orderId}} was cancelled — the retailer didn\'t respond in time. Please reorder.' },
  ORDER_CANCELLED_REJECTED:  { title: 'Order Declined', body: 'Sorry, order #{{orderId}} was declined by the retailer.' },
  ORDER_CANCELLED_ADMIN:     { title: 'Order Cancelled', body: 'Order #{{orderId}} was cancelled. A refund will be initiated shortly.' },

  // Payment
  PAYMENT_CONFIRMED:         { title: 'Payment Successful 💳', body: '₹{{amount}} payment confirmed for order #{{orderId}}.' },
  REFUND_PROCESSED:          { title: 'Refund Processed 💰', body: '₹{{amount}} refund for order #{{orderId}} has been initiated to your original payment method.' },
  REFUND_DELAYED:            { title: 'Refund Update', body: 'We\'re processing your refund for order #{{orderId}}. Our team is looking into it.' },

  // Retailer
  RETAILER_NEW_ORDER:        { title: 'New Order 🛍️', body: 'Order #{{orderId}} for ₹{{amount}}. Confirm within {{timeoutMinutes}} min.' },
  RETAILER_RIDER_ASSIGNED:   { title: 'Rider on the Way 🛵', body: 'A rider has been assigned and will pick up order #{{orderId}} shortly.' },

  // Delivery partner
  DELIVERY_OFFER:            { title: 'New Delivery Request 📦', body: 'Order #{{orderId}} near you — ₹{{amount}}. Accept within {{timeoutSeconds}}s.' },
  DELIVERY_OFFER_EXPIRED:    { title: 'Offer Expired ⏱️', body: 'The delivery request for order #{{orderId}} has expired.' },
  DELIVERY_CANCELLED_MIDWAY: { title: 'Order Cancelled 🚫', body: 'Order #{{orderId}} was cancelled while in progress. Please check the app.' },
  COD_COLLECTION_REMINDER:   { title: 'COD Collection 💵', body: 'Order #{{orderId}} requires cash/QR collection on delivery.' },

  // Account
  ACCOUNT_APPROVED:          { title: 'Account Approved! 🎊', body: 'Your {{role}} account has been approved. Start using Zinikart.' },
  ACCOUNT_REJECTED:          { title: 'Application Update', body: 'Your {{role}} account application was not approved. Contact support.' },
} as const

export type NotificationTemplateKey = keyof typeof NOTIFICATION_TEMPLATES
