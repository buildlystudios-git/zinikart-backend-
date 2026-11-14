import type { Payload, PayloadRequest } from 'payload'

import type { Order, Retailer, SupportChat, User } from '@/payload-types'

const DAY_MS = 24 * 60 * 60 * 1000

export type DashboardPeriod = 'today' | 'week' | 'month'

type DashboardOrder = {
  id: string
  customer: string
  retailer: string
  amount: number
  status: Order['status']
  createdAt: string
}

export type DashboardTicket = {
  id: string
  heading: string
  type: SupportChat['type']
  status: SupportChat['status']
  initiatorType: SupportChat['initiatorType']
  createdAt: string
}

export type DashboardChartRevenue = {
  period: DashboardPeriod
  values: number[]
  labels: string[]
  total: number
  subtext: string
}

const startOfDay = (daysAgo = 0) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

const getPeriodBounds = (period: DashboardPeriod) => {
  if (period === 'month') {
    return {
      currentStart: startOfDay(29),
      previousStart: startOfDay(59),
      comparisonLabel: 'vs Previous Month',
    }
  }

  if (period === 'week') {
    return {
      currentStart: startOfDay(6),
      previousStart: startOfDay(13),
      comparisonLabel: 'vs Previous Week',
    }
  }

  return {
    currentStart: startOfDay(0),
    previousStart: startOfDay(1),
    comparisonLabel: 'vs Yesterday',
  }
}

const countSince = (payload: Payload, req: PayloadRequest, collection: 'users' | 'retailers' | 'delivery-partners' | 'orders', since: string) =>
  payload.count({ collection, req, where: { createdAt: { greater_than_equal: since } } })

const getPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / previous) * 100
}

const getRelationshipTitle = <T extends User | Retailer>(value: string | T | null | undefined, field: keyof T) => {
  if (!value || typeof value === 'string') return 'Unknown'
  const title = value[field]
  return typeof title === 'string' && title ? title : 'Unknown'
}

async function getRecentOrders(payload: Payload, req: PayloadRequest): Promise<DashboardOrder[]> {
  const result = await payload.find({
    collection: 'orders',
    depth: 1,
    limit: 5,
    req,
    sort: '-createdAt',
  })

  return result.docs.map((order) => ({
    id: order.id,
    customer: getRelationshipTitle(order.customer, 'name'),
    retailer: getRelationshipTitle(order.retailer, 'shopName'),
    amount: (order as any).total ?? (order as any).amount ?? 0,
    status: order.status,
    createdAt: order.createdAt,
  }))
}

async function getRecentTransactionAmounts(payload: Payload, req: PayloadRequest, since: string) {
  const amounts: { amount: number; createdAt: string }[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'transactions',
      depth: 0,
      limit: 100,
      page,
      req,
      where: {
        and: [
          { status: { equals: 'succeeded' } },
          { createdAt: { greater_than_equal: since } },
        ],
      },
    })

    amounts.push(...result.docs.map((transaction) => ({ amount: transaction.amount ?? 0, createdAt: transaction.createdAt })))
    hasNextPage = result.hasNextPage
    page += 1
  }

  return amounts
}

export async function getDashboardData(
  payload: Payload,
  req: PayloadRequest,
  options?: {
    ordersPeriod?: DashboardPeriod
    revenuePeriod?: DashboardPeriod
    chartPeriod?: DashboardPeriod
  },
) {
  const ordersPeriod = options?.ordersPeriod || 'today'
  const revenuePeriod = options?.revenuePeriod || 'today'
  const chartPeriod = options?.chartPeriod || 'week'

  const ordersBounds = getPeriodBounds(ordersPeriod)
  const revenueBounds = getPeriodBounds(revenuePeriod)

  const today = startOfDay()
  const weekStart = startOfDay(6)
  const chartStart =
    chartPeriod === 'month'
      ? startOfDay(29)
      : chartPeriod === 'today'
        ? startOfDay(0)
        : startOfDay(6)

  const earliestTxSince = [revenueBounds.previousStart, chartStart, weekStart].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  )[0]

  const [
    users,
    retailers,
    deliveryPartners,
    todayUsers,
    todayRetailers,
    todayPartners,
    pendingRetailers,
    pendingPartners,
    currentOrdersCount,
    previousOrdersCount,
    recentOrders,
    transactions,
    openTickets,
    pendingTickets,
    resolvedTickets,
    recentTicketsResult,
  ] = await Promise.all([
    payload.count({ collection: 'users', req }),
    payload.count({ collection: 'retailers', req }),
    payload.count({ collection: 'delivery-partners', req }),
    countSince(payload, req, 'users', today),
    countSince(payload, req, 'retailers', today),
    countSince(payload, req, 'delivery-partners', today),
    payload.count({ collection: 'retailers', req, where: { approvalStatus: { equals: 'pending' } } }),
    payload.count({ collection: 'delivery-partners', req, where: { approvalStatus: { equals: 'pending' } } }),
    payload.count({
      collection: 'orders',
      req,
      where: { createdAt: { greater_than_equal: ordersBounds.currentStart } },
    }),
    payload.count({
      collection: 'orders',
      req,
      where: {
        and: [
          { createdAt: { greater_than_equal: ordersBounds.previousStart } },
          { createdAt: { less_than: ordersBounds.currentStart } },
        ],
      },
    }),
    getRecentOrders(payload, req),
    getRecentTransactionAmounts(payload, req, earliestTxSince),
    payload.count({ collection: 'support-chats', req, where: { status: { equals: 'open' } } }),
    payload.count({ collection: 'support-chats', req, where: { status: { equals: 'pending' } } }),
    payload.count({ collection: 'support-chats', req, where: { status: { in: ['resolved', 'closed'] } } }),
    payload.find({
      collection: 'support-chats',
      depth: 1,
      limit: 5,
      req,
      sort: '-createdAt',
    }),
  ])

  // Chart revenue calculation based on chartPeriod
  let chartRevenue: DashboardChartRevenue
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (chartPeriod === 'today') {
    const todayStartMs = new Date(startOfDay(0)).getTime()
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
    const intervals = Array.from({ length: 6 }, (_, i) => ({
      start: todayStartMs + i * FOUR_HOURS_MS,
      end: todayStartMs + (i + 1) * FOUR_HOURS_MS,
    }))
    const values = intervals.map(({ start, end }) =>
      transactions.reduce((sum, tx) => {
        const time = new Date(tx.createdAt).getTime()
        return time >= start && time < end ? sum + tx.amount : sum
      }, 0),
    )
    chartRevenue = {
      period: 'today',
      values,
      labels: ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'],
      total: values.reduce((sum, v) => sum + v, 0),
      subtext: 'Today',
    }
  } else if (chartPeriod === 'month') {
    const weekIntervals = [
      { start: new Date(startOfDay(29)).getTime(), end: new Date(startOfDay(22)).getTime(), label: 'Wk 1' },
      { start: new Date(startOfDay(22)).getTime(), end: new Date(startOfDay(15)).getTime(), label: 'Wk 2' },
      { start: new Date(startOfDay(15)).getTime(), end: new Date(startOfDay(7)).getTime(), label: 'Wk 3' },
      { start: new Date(startOfDay(7)).getTime(), end: Date.now() + DAY_MS, label: 'Wk 4' },
    ]
    const values = weekIntervals.map(({ start, end }) =>
      transactions.reduce((sum, tx) => {
        const time = new Date(tx.createdAt).getTime()
        return time >= start && time < end ? sum + tx.amount : sum
      }, 0),
    )
    chartRevenue = {
      period: 'month',
      values,
      labels: weekIntervals.map((i) => i.label),
      total: values.reduce((sum, v) => sum + v, 0),
      subtext: 'last 30 days',
    }
  } else {
    // Default: 'week'
    const dayStartTimes = Array.from({ length: 7 }, (_, index) => new Date(startOfDay(6 - index)).getTime())
    const values = dayStartTimes.map((start, index) => {
      const end = index === dayStartTimes.length - 1 ? Date.now() + DAY_MS : dayStartTimes[index + 1]
      return transactions.reduce((total, transaction) => {
        const createdAt = new Date(transaction.createdAt).getTime()
        return createdAt >= start && createdAt < end ? total + transaction.amount : total
      }, 0)
    })
    chartRevenue = {
      period: 'week',
      values,
      labels: dayStartTimes.map((t) => dayNames[new Date(t).getDay()]),
      total: values.reduce((sum, v) => sum + v, 0),
      subtext: 'last 7 days',
    }
  }

  // Period revenue calculation for the SpecialMetricCard
  const currentRevenueStartMs = new Date(revenueBounds.currentStart).getTime()
  const previousRevenueStartMs = new Date(revenueBounds.previousStart).getTime()

  let currentRevenue = 0
  let previousRevenue = 0

  for (const t of transactions) {
    const tTime = new Date(t.createdAt).getTime()
    if (tTime >= currentRevenueStartMs) {
      currentRevenue += t.amount
    } else if (tTime >= previousRevenueStartMs && tTime < currentRevenueStartMs) {
      previousRevenue += t.amount
    }
  }

  const ordersChange = getPercentageChange(currentOrdersCount.totalDocs, previousOrdersCount.totalDocs)
  const revenueChange = getPercentageChange(currentRevenue, previousRevenue)

  const recentTickets: DashboardTicket[] = recentTicketsResult.docs.map((chat) => ({
    id: chat.id,
    heading: chat.heading,
    type: chat.type,
    status: chat.status,
    initiatorType: chat.initiatorType,
    createdAt: chat.createdAt,
  }))

  return {
    metrics: {
      orders: {
        total: currentOrdersCount.totalDocs,
        change: ordersChange,
        period: ordersPeriod,
        comparisonLabel: ordersBounds.comparisonLabel,
      },
      revenue: {
        total: currentRevenue,
        change: revenueChange,
        period: revenuePeriod,
        comparisonLabel: revenueBounds.comparisonLabel,
      },
      users: { total: users.totalDocs, today: todayUsers.totalDocs },
      retailers: { total: retailers.totalDocs, today: todayRetailers.totalDocs },
      deliveryPartners: { total: deliveryPartners.totalDocs, today: todayPartners.totalDocs },
    },
    pendingApprovals: {
      retailers: pendingRetailers.totalDocs,
      deliveryPartners: pendingPartners.totalDocs,
    },
    recentOrders,
    chartRevenue,
    weeklyRevenue: chartRevenue.values,
    supportTickets: {
      counts: {
        open: openTickets.totalDocs,
        inProgress: pendingTickets.totalDocs,
        resolved: resolvedTickets.totalDocs,
      },
      recent: recentTickets,
    },
  }
}
