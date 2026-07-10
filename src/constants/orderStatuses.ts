export const ORDER_STATUS = {
  PLACED: 'placed',
  ORDER_RECEIVED: 'order_received',
  PREPARING: 'preparing',
  PACKED: 'packed',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  REACHED_LOCATION: 'reached_location',
  DELIVERED: 'delivered',
  COD_PAYMENT_RECEIVED: 'cod_payment_received',
  CANCELLED: 'cancelled',
} as const

export type OrderStatusValue = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

// Reusable Payload select options array
export const ORDER_STATUS_OPTIONS = [
  { label: 'Placed', value: ORDER_STATUS.PLACED },
  { label: 'Order Received', value: ORDER_STATUS.ORDER_RECEIVED },
  { label: 'Preparing', value: ORDER_STATUS.PREPARING },
  { label: 'Packed', value: ORDER_STATUS.PACKED },
  { label: 'Ready for Pickup', value: ORDER_STATUS.READY_FOR_PICKUP },
  { label: 'Picked Up', value: ORDER_STATUS.PICKED_UP },
  { label: 'Out for Delivery', value: ORDER_STATUS.OUT_FOR_DELIVERY },
  { label: 'Reached Location', value: ORDER_STATUS.REACHED_LOCATION },
  { label: 'Delivered', value: ORDER_STATUS.DELIVERED },
  { label: 'COD Payment Received', value: ORDER_STATUS.COD_PAYMENT_RECEIVED },
  { label: 'Cancelled', value: ORDER_STATUS.CANCELLED },
] as const

export const DELIVERY_ACCEPTANCE = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  UNASSIGNABLE: 'unassignable',
} as const

export const CHANGE_SOURCE = {
  RETAILER: 'retailer',
  DELIVERY_PARTNER: 'delivery_partner',
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const

// Statuses that indicate a rider is "busy" (on an active delivery)
export const ACTIVE_DELIVERY_STATUSES = [
  ORDER_STATUS.ORDER_RECEIVED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.REACHED_LOCATION,
] as const
