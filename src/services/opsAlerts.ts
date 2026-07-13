import { SLACK_OPS_WEBHOOK_URL } from '@/constants/env'

const sendSlackAlert = async (text: string) => {
  if (!SLACK_OPS_WEBHOOK_URL) {
    console.warn(`[OPS ALERT] ${text}`)
    return
  }

  try {
    const response = await fetch(SLACK_OPS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    
    if (!response.ok) {
      console.error(`Failed to send ops alert to Slack: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`Error sending ops alert: ${error}`)
  }
}

export const opsAlerts = {
  orderUnassignable: async (orderId: string) => {
    await sendSlackAlert(`🚨 *Order Unassignable*\nOrder \`${orderId}\` could not be assigned to any delivery partner. All candidates exhausted or none available.`)
  },
  refundFailed: async (orderId: string, transactionId: string, reason: string) => {
    await sendSlackAlert(`⚠️ *Refund Failed*\nOrder: \`${orderId}\`\nTransaction: \`${transactionId}\`\nReason: ${reason}\nNeeds manual intervention on Razorpay dashboard.`)
  },
}
