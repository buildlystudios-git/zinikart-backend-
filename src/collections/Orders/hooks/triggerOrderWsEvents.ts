import type { CollectionAfterChangeHook } from 'payload'
import { ORDER_STATUS } from '@/constants/orderStatuses'
import { WS_INTERNAL_URL, WS_INTERNAL_SECRET } from '@/constants/env'

/**
 * Sends a real-time order broadcast request to the standalone WebSocket service.
 */
async function broadcastToOrderWs({
  orderId,
  targetUserIds,
  type,
  payload,
  excludeUserId,
}: {
  orderId?: string | number
  targetUserIds?: (string | number)[]
  type: string
  payload: any
  excludeUserId?: string | number
}): Promise<void> {
  try {
    const res = await fetch(`${WS_INTERNAL_URL}/internal/broadcast-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Internal ${WS_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({
        orderId: orderId ? String(orderId) : undefined,
        targetUserIds: targetUserIds ? targetUserIds.map(String) : undefined,
        type,
        payload,
        excludeUserId: excludeUserId ? String(excludeUserId) : undefined,
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      console.warn(`[Order WS Hook] Broadcast returned HTTP ${res.status}`)
    }
  } catch (err: any) {
    // Non-fatal: if WS server is restarting or down, DB operation continues normally
    console.warn('[Order WS Hook] WS service unavailable for broadcast:', err.message)
  }
}

/**
 * Sanitizes order data into a lightweight summary payload suitable for real-time delivery.
 */
function formatOrderSummary(doc: any) {
  const retailerObj =
    typeof doc.retailer === 'object' && doc.retailer !== null
      ? {
          id: doc.retailer.id,
          shopName: doc.retailer.shopName,
          mobileNumber: doc.retailer.mobileNumber,
          shopAddress: doc.retailer.shopAddress,
        }
      : { id: doc.retailer }

  const dpObj =
    typeof doc.deliveryPartner === 'object' && doc.deliveryPartner !== null
      ? {
          id: doc.deliveryPartner.id,
          fullName: doc.deliveryPartner.fullName,
          mobileNumber: doc.deliveryPartner.mobileNumber,
          vehicleType: doc.deliveryPartner.vehicleType,
          vehicleRegistrationNumber: doc.deliveryPartner.vehicleRegistrationNumber,
        }
      : doc.deliveryPartner
      ? { id: doc.deliveryPartner }
      : null

  return {
    id: doc.id,
    status: doc.status,
    total: doc.total,
    subtotal: doc.subtotal,
    deliveryFee: doc.deliveryFee,
    currency: doc.currency || 'INR',
    itemsCount: Array.isArray(doc.items) ? doc.items.length : 0,
    items: doc.items || [],
    retailer: retailerObj,
    deliveryPartner: dpObj,
    deliveryPartnerAcceptance: doc.deliveryPartnerAcceptance,
    statusHistory: doc.statusHistory || [],
    shippingAddress: doc.shippingAddress,
    cancellationDetails: doc.cancellationDetails,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const triggerOrderWsEvents: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const payload = req.payload
  const orderSummary = formatOrderSummary(doc)

  // Helper to resolve the user ID associated with a retailer profile
  const resolveRetailerUserId = async (retailerRelation: any): Promise<string | null> => {
    const retId =
      typeof retailerRelation === 'object' && retailerRelation ? retailerRelation.id : retailerRelation
    if (!retId) return null
    try {
      const retDoc: any = await payload.findByID({ collection: 'retailers', id: retId, depth: 0, req })
      const uid = typeof retDoc?.user === 'object' && retDoc?.user ? retDoc.user.id : retDoc?.user
      return uid ? String(uid) : null
    } catch {
      return null
    }
  }

  // Helper to resolve the user ID associated with a delivery partner profile
  const resolveDpUserId = async (dpRelation: any): Promise<string | null> => {
    const dpId =
      typeof dpRelation === 'object' && dpRelation ? dpRelation.id : dpRelation
    if (!dpId) return null
    try {
      const dpDoc: any = await payload.findByID({
        collection: 'delivery-partners',
        id: dpId,
        depth: 0,
        req,
      })
      const uid = typeof dpDoc?.user === 'object' && dpDoc?.user ? dpDoc.user.id : dpDoc?.user
      return uid ? String(uid) : null
    } catch {
      return null
    }
  }

  // Customer User ID
  const customerUserId = doc.customer
    ? String(typeof doc.customer === 'object' && doc.customer ? doc.customer.id : doc.customer)
    : null

  // ─── 1. Order Placed (Creation) ─────────────────────────────────────────────
  if (operation === 'create') {
    const retailerUserId = await resolveRetailerUserId(doc.retailer)

    // Notify Retailer feed
    if (retailerUserId) {
      await broadcastToOrderWs({
        orderId: doc.id,
        targetUserIds: [retailerUserId],
        type: 'order:new',
        payload: {
          orderId: doc.id,
          status: doc.status,
          order: orderSummary,
        },
      })
    }

    // Notify Customer
    if (customerUserId) {
      await broadcastToOrderWs({
        orderId: doc.id,
        targetUserIds: [customerUserId],
        type: 'order:status_changed',
        payload: {
          orderId: doc.id,
          status: doc.status,
          previousStatus: null,
          order: orderSummary,
        },
      })
    }

    return doc
  }

  // ─── 2. Order Updates ───────────────────────────────────────────────────────
  if (operation === 'update') {
    const isStatusChanged = doc.status !== previousDoc?.status

    // A. Status transitions
    if (isStatusChanged) {
      const retailerUserId = await resolveRetailerUserId(doc.retailer)
      const dpUserId = await resolveDpUserId(doc.deliveryPartner)

      let eventType = 'order:status_changed'
      if (doc.status === ORDER_STATUS.CANCELLED) {
        eventType = 'order:cancelled'
      } else if (doc.status === ORDER_STATUS.DELIVERED) {
        eventType = 'order:delivered'
      } else if (doc.status === ORDER_STATUS.COD_PAYMENT_RECEIVED) {
        eventType = 'order:cod_collected'
      }

      const notifyTargets = [customerUserId, retailerUserId, dpUserId].filter(Boolean) as string[]

      await broadcastToOrderWs({
        orderId: doc.id,
        targetUserIds: notifyTargets,
        type: eventType,
        payload: {
          orderId: doc.id,
          status: doc.status,
          previousStatus: previousDoc?.status,
          order: orderSummary,
        },
      })

      // If delivered, also notify the delivery partner
      if (doc.status === ORDER_STATUS.DELIVERED && dpUserId) {
        await broadcastToOrderWs({
          orderId: doc.id,
          targetUserIds: [dpUserId],
          type: 'delivery:complete',
          payload: {
            orderId: doc.id,
            deliveredAt: new Date().toISOString(),
          },
        })
      }
    }

    // B. Delivery partner assignment offer (candidate offered)
    const prevCandidateId =
      typeof previousDoc?.currentOfferedPartner === 'object'
        ? previousDoc?.currentOfferedPartner?.id
        : previousDoc?.currentOfferedPartner
    const currCandidateId =
      typeof doc.currentOfferedPartner === 'object'
        ? doc.currentOfferedPartner?.id
        : doc.currentOfferedPartner

    if (currCandidateId && currCandidateId !== prevCandidateId) {
      const offeredDpUserId = await resolveDpUserId(currCandidateId)
      if (offeredDpUserId) {
        await broadcastToOrderWs({
          orderId: doc.id,
          targetUserIds: [offeredDpUserId],
          type: 'delivery:offer',
          payload: {
            orderId: doc.id,
            candidateId: currCandidateId,
            offerExpiresAt: doc.offerExpiresAt,
            deliveryFee: doc.deliveryFee,
            retailer: orderSummary.retailer,
            shippingAddress: doc.shippingAddress,
            itemsCount: orderSummary.itemsCount,
            total: doc.total,
          },
        })
      }
    }

    // C. Delivery partner offer withdrawn or expired
    if (
      prevCandidateId &&
      !currCandidateId &&
      doc.deliveryPartnerAcceptance !== 'accepted'
    ) {
      const prevDpUserId = await resolveDpUserId(prevCandidateId)
      if (prevDpUserId) {
        await broadcastToOrderWs({
          orderId: doc.id,
          targetUserIds: [prevDpUserId],
          type: 'delivery:offer_cancelled',
          payload: {
            orderId: doc.id,
            reason:
              doc.status === ORDER_STATUS.CANCELLED
                ? 'Order was cancelled'
                : 'Offer expired or rejected',
          },
        })
      }
    }

    // D. Delivery partner accepted
    if (
      doc.deliveryPartner &&
      !previousDoc?.deliveryPartner &&
      doc.deliveryPartnerAcceptance === 'accepted'
    ) {
      const retailerUserId = await resolveRetailerUserId(doc.retailer)
      const targets = [customerUserId, retailerUserId].filter(Boolean) as string[]
      await broadcastToOrderWs({
        orderId: doc.id,
        targetUserIds: targets,
        type: 'delivery:assigned',
        payload: {
          orderId: doc.id,
          deliveryPartner: orderSummary.deliveryPartner,
        },
      })
    }

    // E. All delivery partners rejected / exhausted (marked unassignable)
    if (
      doc.deliveryPartnerAcceptance === 'unassignable' &&
      previousDoc?.deliveryPartnerAcceptance !== 'unassignable'
    ) {
      const retailerUserId = await resolveRetailerUserId(doc.retailer)
      if (retailerUserId) {
        await broadcastToOrderWs({
          orderId: doc.id,
          targetUserIds: [retailerUserId],
          type: 'delivery:no_partner',
          payload: {
            orderId: doc.id,
            message: 'No delivery partner currently available in the area.',
          },
        })
      }
    }
  }

  return doc
}

