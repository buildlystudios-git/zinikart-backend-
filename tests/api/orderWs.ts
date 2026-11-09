import { ReportManager, apiRequest } from './helpers'
import type { Payload } from 'payload'
import { WebSocket } from 'ws'
import { ORDER_STATUS, DELIVERY_ACCEPTANCE } from '../../src/constants/orderStatuses'
import { WS_PORT, WS_INTERNAL_SECRET } from '../../src/constants/env'

const WS_BASE_URL = `ws://localhost:${WS_PORT}`
const HTTP_BASE_URL = `http://localhost:${WS_PORT}`
const INTERNAL_SECRET = WS_INTERNAL_SECRET

/**
 * Connects to the WebSocket server and resolves once connected or once unexpected-response is received.
 */
function connectWs(token?: string): Promise<{ ws: WebSocket; unexpectedResponse?: number }> {
  return new Promise((resolve) => {
    const url = token ? `${WS_BASE_URL}?token=${token}` : WS_BASE_URL
    const ws = new WebSocket(url)
    let settled = false

    ws.on('open', () => {
      if (!settled) {
        settled = true
        resolve({ ws })
      }
    })

    ws.on('unexpected-response', (_req, res) => {
      if (!settled) {
        settled = true
        resolve({ ws, unexpectedResponse: res.statusCode })
      }
    })

    ws.on('error', () => {
      // Connection errors handled via settlement check
    })

    setTimeout(() => {
      if (!settled) {
        settled = true
        resolve({ ws, unexpectedResponse: 408 })
      }
    }, 4000)
  })
}

/**
 * Listens for a specific WebSocket message that matches the given predicate with a timeout.
 */
function waitForWsMessage(
  ws: WebSocket,
  predicate: (msg: any) => boolean,
  timeoutMs = 6000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage)
      reject(new Error(`Timeout waiting for WS message after ${timeoutMs}ms`))
    }, timeoutMs)

    const onMessage = (data: any) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (predicate(parsed)) {
          clearTimeout(timer)
          ws.off('message', onMessage)
          resolve(parsed)
        }
      } catch {
        // ignore parse error
      }
    }

    ws.on('message', onMessage)
  })
}

export async function runOrderWsTests(
  report: ReportManager,
  payload: Payload,
  adminToken: string,
  retailerToken: string,
  customerToken: string
) {
  report.setSuite('Order WebSocket Real-Time Events')
  console.log('\nRunning Order WebSocket Real-Time Events integration tests...')

  const openSockets: WebSocket[] = []

  try {
    // ─── 1. Health & Service Diagnostics ─────────────────────────────────────────
    console.log('\nTesting WebSocket service health and internal APIs...')

    let healthRes: any = null
    try {
      const res = await fetch(`${HTTP_BASE_URL}/health`)
      healthRes = await res.json()
    } catch (err: any) {
      report.assert('WebSocket server is reachable at port 3001', false, 'Best Case', err.message)
      return
    }

    report.assert(
      'WebSocket health endpoint reports ok and includes orderRooms, retailerFeeds, and dpFeeds counters',
      healthRes?.status === 'ok' &&
        typeof healthRes?.orderRooms === 'number' &&
        typeof healthRes?.retailerFeeds === 'number' &&
        typeof healthRes?.dpFeeds === 'number',
      'Best Case',
      `Health response: ${JSON.stringify(healthRes)}`
    )

    // ─── 2. Internal Broadcast Security ──────────────────────────────────────────
    const unauthBroadcastRes = await fetch(`${HTTP_BASE_URL}/internal/broadcast-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Internal wrong-secret',
      },
      body: JSON.stringify({ type: 'test' }),
    })

    report.assert(
      'Internal order broadcast endpoint rejects unauthorized requests with 403 Forbidden',
      unauthBroadcastRes.status === 403,
      'Impossible Scenario',
      `Expected 403, got ${unauthBroadcastRes.status}`
    )

    const authBroadcastRes = await fetch(`${HTTP_BASE_URL}/internal/broadcast-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Internal ${INTERNAL_SECRET}`,
      },
      body: JSON.stringify({ type: 'test:ping', payload: { test: true } }),
    })

    report.assert(
      'Internal order broadcast endpoint accepts authorized requests with 200 OK',
      authBroadcastRes.status === 200,
      'Best Case',
      `Expected 200, got ${authBroadcastRes.status}`
    )

    // ─── 3. Connection Authentication ────────────────────────────────────────────
    console.log('\nTesting connection authentication and handshake...')

    const unauthConn = await connectWs()
    openSockets.push(unauthConn.ws)
    report.assert(
      'WebSocket connection without authentication token is rejected with 401 Unauthorized',
      unauthConn.unexpectedResponse === 401,
      'Worst Case',
      `Expected unexpectedResponse 401, got ${unauthConn.unexpectedResponse}`
    )

    const customerConn = await connectWs(customerToken)
    openSockets.push(customerConn.ws)
    report.assert(
      'Customer connects to WebSocket server with valid token',
      customerConn.ws.readyState === WebSocket.OPEN,
      'Best Case',
      `Socket readyState: ${customerConn.ws.readyState}`
    )

    const retailerConn = await connectWs(retailerToken)
    openSockets.push(retailerConn.ws)
    report.assert(
      'Retailer connects to WebSocket server with valid token',
      retailerConn.ws.readyState === WebSocket.OPEN,
      'Best Case',
      `Socket readyState: ${retailerConn.ws.readyState}`
    )

    // Create / fetch a Delivery Partner user and token
    const dpEmail = 'dp.wstest@testing.zinikart.local'
    let dpUser = (
      await payload.find({
        collection: 'users',
        where: { email: { equals: dpEmail } },
        overrideAccess: true,
      })
    ).docs[0]

    if (!dpUser) {
      dpUser = await payload.create({
        collection: 'users',
        data: {
          email: dpEmail,
          mobileNumber: '+915555555555',
          password: 'dpPassword123',
          roles: ['delivery_partner'],
        } as any,
        overrideAccess: true,
      })
    }

    const dpLoginRes = await apiRequest('/api/users/login', 'POST', {
      email: dpEmail,
      password: 'dpPassword123',
    })
    const dpToken = dpLoginRes.body?.token

    report.assert(
      'Obtained valid delivery partner JWT token',
      typeof dpToken === 'string' && dpToken.length > 0,
      'Best Case'
    )

    const dpConn = await connectWs(dpToken)
    openSockets.push(dpConn.ws)
    report.assert(
      'Delivery partner connects to WebSocket server with valid token',
      dpConn.ws.readyState === WebSocket.OPEN,
      'Best Case',
      `Socket readyState: ${dpConn.ws.readyState}`
    )

    // Ensure DP has a delivery-partners profile
    let dpProfile = (
      await payload.find({
        collection: 'delivery-partners',
        where: { user: { equals: dpUser.id } },
        overrideAccess: true,
      })
    ).docs[0]

    if (!dpProfile) {
      const mediaDocs = await payload.find({ collection: 'media', limit: 1, overrideAccess: true })
      const mId = mediaDocs.docs[0]?.id

      dpProfile = await payload.create({
        collection: 'delivery-partners',
        data: {
          user: dpUser.id,
          fullName: 'WS Express Rider',
          mobileNumber: '+915555555555',
          email: dpEmail,
          gender: 'male',
          dob: '1995-01-01',
          drivingLicense: mId,
          drivingLicenseNumber: 'DL1234567890',
          pancardNumber: 'ABCDE1234F',
          pancardImage: mId,
          vehicleBrand: 'Honda Activa',
          vehicleRegistrationNumber: 'DL-01-WS-9999',
          vehicleType: 'scooter',
          selfieImage: mId,
          approvalStatus: 'approved',
          onlineStatus: true,
          lastLocationUpdatedAt: new Date().toISOString(),
          paymentMethods: [
            {
              methodType: 'upi',
              isDefault: true,
              upiId: 'rider@upi',
            },
          ],
        } as any,
        overrideAccess: true,
      })
    }

    // ─── 4. Feed Subscriptions & Role-Based Authorization ────────────────────────
    console.log('\nTesting channel feed subscriptions and permissions...')

    // Customer tries to join retailer feed (should be forbidden)
    customerConn.ws.send(JSON.stringify({ type: 'join_retailer_feed' }))
    const custRetailerFeedErr = await waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'error' && m.code === 'forbidden'
    )
    report.assert(
      'Customer is forbidden from subscribing to retailer live feed',
      custRetailerFeedErr?.code === 'forbidden',
      'Impossible Scenario'
    )

    // Customer tries to join DP feed (should be forbidden)
    customerConn.ws.send(JSON.stringify({ type: 'join_dp_feed' }))
    const custDpFeedErr = await waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'error' && m.code === 'forbidden'
    )
    report.assert(
      'Customer is forbidden from subscribing to delivery partner feed',
      custDpFeedErr?.code === 'forbidden',
      'Impossible Scenario'
    )

    // Retailer joins retailer feed
    retailerConn.ws.send(JSON.stringify({ type: 'join_retailer_feed' }))
    const retailerFeedAck = await waitForWsMessage(
      retailerConn.ws,
      (m) => m.type === 'joined_retailer_feed'
    )
    report.assert(
      'Retailer successfully subscribes to live retailer feed (joined_retailer_feed)',
      retailerFeedAck?.type === 'joined_retailer_feed',
      'Best Case'
    )

    // DP joins DP feed
    dpConn.ws.send(JSON.stringify({ type: 'join_dp_feed' }))
    const dpFeedAck = await waitForWsMessage(dpConn.ws, (m) => m.type === 'joined_dp_feed')
    report.assert(
      'Delivery partner successfully subscribes to live DP feed (joined_dp_feed)',
      dpFeedAck?.type === 'joined_dp_feed',
      'Best Case'
    )

    // ─── 5. Order Creation & Live order:new Event ────────────────────────────────
    console.log('\nTesting live order creation and order:new broadcast...')

    // Resolve retailer profile ID
    const retailerUserRes = await apiRequest('/api/users/me', 'GET', null, retailerToken)
    const retailerUserId = retailerUserRes.body?.user?.id

    const retProfile = (
      await payload.find({
        collection: 'retailers',
        where: { user: { equals: retailerUserId } },
        overrideAccess: true,
      })
    ).docs[0]

    // Resolve customer user ID
    const customerUserRes = await apiRequest('/api/users/me', 'GET', null, customerToken)
    const customerUserId = customerUserRes.body?.user?.id

    // Create a mock product belonging to this retailer
    const testProduct = await payload.create({
      collection: 'products',
      data: {
        title: 'WS Test Product',
        slug: `ws-test-product-${Date.now()}`,
        retailer: retailerUserId,
        priceInINR: 849,
        inventory: 100,
        _status: 'published',
      } as any,
      overrideAccess: true,
    })

    // Set up a listener on retailer socket for order:new BEFORE creating order
    const orderNewPromise = waitForWsMessage(
      retailerConn.ws,
      (m) => m.type === 'order:new'
    )

    // Create a new order via Payload (status: 'placed')
    const testOrder = await payload.create({
      collection: 'orders',
      data: {
        customer: customerUserId,
        retailer: retProfile.id,
        status: ORDER_STATUS.PLACED,
        total: 899,
        subtotal: 849,
        deliveryFee: 50,
        currency: 'INR',
        pickupOTP: '4455',
        deliveryOTP: '7788',
        shippingAddress: {
          street: '123 Test St',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001',
        },
        items: [
          {
            product: testProduct.id,
            price: 849,
            quantity: 1,
          },
        ],
      } as any,
      overrideAccess: true,
    })

    const receivedOrderNew = await orderNewPromise
    report.assert(
      'Retailer receives real-time order:new event on retailer_feed when order is placed',
      receivedOrderNew?.type === 'order:new' && receivedOrderNew?.orderId === testOrder.id,
      'Best Case',
      `Received payload: ${JSON.stringify(receivedOrderNew)}`
    )

    // ─── 6. Order Room Subscription & Snapshot (No Polling) ──────────────────────
    console.log('\nTesting order room subscription, authorization, and instant snapshot...')

    // Customer joins their order room
    customerConn.ws.send(JSON.stringify({ type: 'join_order', orderId: testOrder.id }))

    const customerJoinAck = await waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'joined_order' && m.orderId === testOrder.id
    )
    report.assert(
      'Customer receives joined_order confirmation for their order',
      customerJoinAck?.orderId === testOrder.id,
      'Best Case'
    )

    const customerSnapshot = await waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'order:snapshot' && m.orderId === testOrder.id
    )

    report.assert(
      'Server immediately pushes order:snapshot on join without client polling',
      customerSnapshot?.type === 'order:snapshot' &&
        customerSnapshot?.order?.id === testOrder.id &&
        customerSnapshot?.order?.status === ORDER_STATUS.PLACED,
      'Best Case'
    )

    // Verify OTP scoping: Customer sees deliveryOTP, but NOT pickupOTP
    report.assert(
      'Customer snapshot reveals deliveryOTP for handover verification',
      customerSnapshot?.order?.deliveryOTP === '7788',
      'Best Case'
    )

    report.assert(
      'Customer snapshot conceals pickupOTP for security',
      customerSnapshot?.order?.pickupOTP === undefined,
      'Impossible Scenario',
      `pickupOTP was leaked to customer: ${customerSnapshot?.order?.pickupOTP}`
    )

    // Retailer joins order room and checks snapshot OTP scoping
    retailerConn.ws.send(JSON.stringify({ type: 'join_order', orderId: testOrder.id }))
    const retailerSnapshot = await waitForWsMessage(
      retailerConn.ws,
      (m) => m.type === 'order:snapshot' && m.orderId === testOrder.id
    )

    report.assert(
      'Retailer snapshot reveals pickupOTP and conceals deliveryOTP',
      retailerSnapshot?.order?.pickupOTP === '4455' &&
        retailerSnapshot?.order?.deliveryOTP === undefined,
      'Possible Scenario',
      `Retailer snapshot OTPs: pickup=${retailerSnapshot?.order?.pickupOTP}, delivery=${retailerSnapshot?.order?.deliveryOTP}`
    )

    // Non-participant customer tries to join this order room
    const otherUserRes = await apiRequest('/api/users/login', 'POST', {
      email: 'admin.user@testing.zinikart.local',
      password: 'adminPassword123',
    })
    // Let's connect another customer socket without permissions on this order
    // We already have unauth socket; let's test forbidden join from a third user if desired
    // Or test bad order ID:
    customerConn.ws.send(JSON.stringify({ type: 'join_order', orderId: '00000000-0000-0000-0000-000000000000' }))
    const badOrderJoinErr = await waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'error' && (m.code === 'not_found' || m.code === 'forbidden' || m.code === 'server_error')
    )
    report.assert(
      'Joining non-existent order room returns error',
      badOrderJoinErr?.code === 'not_found' || badOrderJoinErr?.code === 'server_error',
      'Worst Case'
    )

    // ─── 7. Order Status Transitions & Live Status Change Broadcast ──────────────
    console.log('\nTesting order status transition broadcast (order:status_changed)...')

    const statusChangePromise = waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'order:status_changed' && m.orderId === testOrder.id
    )

    // Retailer accepts the order: status -> order_received
    await payload.update({
      collection: 'orders',
      id: testOrder.id,
      data: {
        status: ORDER_STATUS.ORDER_RECEIVED,
      },
      overrideAccess: true,
    })

    const receivedStatusChange = await statusChangePromise
    report.assert(
      'Customer receives real-time order:status_changed event when order status changes to order_received',
      receivedStatusChange?.status === ORDER_STATUS.ORDER_RECEIVED &&
        receivedStatusChange?.previousStatus === ORDER_STATUS.PLACED,
      'Best Case',
      `Status change payload: ${JSON.stringify(receivedStatusChange)}`
    )

    // ─── 8. Delivery Assignment: Offer & Offer Cancelled ─────────────────────────
    console.log('\nTesting delivery partner offer events (delivery:offer & delivery:offer_cancelled)...')

    const deliveryOfferPromise = waitForWsMessage(
      dpConn.ws,
      (m) => m.type === 'delivery:offer' && m.orderId === testOrder.id
    )

    // Candidate offered to DP
    await payload.update({
      collection: 'orders',
      id: testOrder.id,
      data: {
        currentOfferedPartner: dpProfile.id,
        offerExpiresAt: new Date(Date.now() + 60000).toISOString(),
        deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.PENDING,
      },
      overrideAccess: true,
    })

    const receivedOffer = await deliveryOfferPromise
    report.assert(
      'Delivery partner receives real-time delivery:offer on dp_feed when candidate is offered',
      receivedOffer?.type === 'delivery:offer' && receivedOffer?.candidateId === dpProfile.id,
      'Best Case',
      `Offer payload: ${JSON.stringify(receivedOffer)}`
    )

    // Offer withdrawn / expired
    const offerCancelledPromise = waitForWsMessage(
      dpConn.ws,
      (m) => m.type === 'delivery:offer_cancelled' && m.orderId === testOrder.id
    )

    await payload.update({
      collection: 'orders',
      id: testOrder.id,
      data: {
        currentOfferedPartner: null,
      },
      overrideAccess: true,
    })

    const receivedCancelled = await offerCancelledPromise
    report.assert(
      'Delivery partner receives real-time delivery:offer_cancelled when offer is withdrawn',
      receivedCancelled?.type === 'delivery:offer_cancelled',
      'Possible Scenario'
    )

    // ─── 9. Delivery Assignment Acceptance ───────────────────────────────────────
    console.log('\nTesting delivery partner assignment acceptance...')

    const deliveryAssignedPromise = waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'delivery:assigned' && m.orderId === testOrder.id
    )

    await payload.update({
      collection: 'orders',
      id: testOrder.id,
      data: {
        deliveryPartner: dpProfile.id,
        deliveryPartnerAcceptance: DELIVERY_ACCEPTANCE.ACCEPTED,
      },
      overrideAccess: true,
    })

    const receivedAssigned = await deliveryAssignedPromise
    report.assert(
      'Customer receives delivery:assigned event when delivery partner is accepted',
      receivedAssigned?.type === 'delivery:assigned' &&
        receivedAssigned?.deliveryPartner?.id === dpProfile.id,
      'Best Case',
      `Assigned payload: ${JSON.stringify(receivedAssigned)}`
    )

    // ─── 10. Order Delivery & Completion Events ──────────────────────────────────
    console.log('\nTesting delivery completion events (order:delivered & delivery:complete)...')

    const customerDeliveredPromise = waitForWsMessage(
      customerConn.ws,
      (m) => m.type === 'order:delivered' && m.orderId === testOrder.id
    )

    const dpCompletePromise = waitForWsMessage(
      dpConn.ws,
      (m) => m.type === 'delivery:complete' && m.orderId === testOrder.id
    )

    // Mark order as delivered (with verified delivery OTP in context)
    await payload.update({
      collection: 'orders',
      id: testOrder.id,
      data: {
        status: ORDER_STATUS.DELIVERED,
      },
      context: {
        providedDeliveryOTP: '7788',
      },
      overrideAccess: true,
    })

    const [custDelivered, dpComplete] = await Promise.all([
      customerDeliveredPromise,
      dpCompletePromise,
    ])

    report.assert(
      'Customer receives order:delivered event on final handover',
      custDelivered?.type === 'order:delivered' &&
        custDelivered?.status === ORDER_STATUS.DELIVERED,
      'Best Case'
    )

    report.assert(
      'Delivery partner receives delivery:complete event to transition app to completion screen',
      dpComplete?.type === 'delivery:complete' && dpComplete?.orderId === testOrder.id,
      'Best Case'
    )

    // ─── 11. Clean Leave & Disconnect ────────────────────────────────────────────
    console.log('\nTesting clean room/feed departure and teardown...')

    customerConn.ws.send(JSON.stringify({ type: 'leave_order', orderId: testOrder.id }))
    const leaveOrderAck = await waitForWsMessage(customerConn.ws, (m) => m.type === 'left_order')
    report.assert(
      'Customer cleanly leaves order room (left_order)',
      leaveOrderAck?.orderId === testOrder.id,
      'Best Case'
    )

    retailerConn.ws.send(JSON.stringify({ type: 'leave_retailer_feed' }))
    const leaveRetailerAck = await waitForWsMessage(
      retailerConn.ws,
      (m) => m.type === 'left_retailer_feed'
    )
    report.assert(
      'Retailer cleanly leaves retailer feed (left_retailer_feed)',
      leaveRetailerAck?.type === 'left_retailer_feed',
      'Best Case'
    )

    dpConn.ws.send(JSON.stringify({ type: 'leave_dp_feed' }))
    const leaveDpAck = await waitForWsMessage(dpConn.ws, (m) => m.type === 'left_dp_feed')
    report.assert(
      'Delivery partner cleanly leaves DP feed (left_dp_feed)',
      leaveDpAck?.type === 'left_dp_feed',
      'Best Case'
    )

    // Clean up test payout ledger, order & product
    await payload.delete({
      collection: 'payout-ledger',
      where: {
        order: { equals: testOrder.id },
      },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'orders',
      id: testOrder.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'products',
      id: testProduct.id,
      overrideAccess: true,
    })
  } catch (err: any) {
    console.error('Error during Order WebSocket test suite execution:', err)
    report.assert('Order WebSocket test suite executed without unhandled crashes', false, 'Best Case', err.message)
  } finally {
    // Terminate all open test sockets
    for (const ws of openSockets) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }
}

