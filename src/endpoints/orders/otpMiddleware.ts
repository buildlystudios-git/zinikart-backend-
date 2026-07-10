// Called from custom order-update endpoints to map REST body to context
export function extractOtpFromBody(body: any): Record<string, string> {
  const ctx: Record<string, string> = {}
  if (body.pickupOTP) ctx.providedPickupOTP = body.pickupOTP
  if (body.deliveryOTP) ctx.providedDeliveryOTP = body.deliveryOTP
  return ctx
}
