import {
  Bike,
  Calendar,
  ChevronRight,
  CircleHelp,
  IndianRupee,
  LayoutGrid,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import {
  type DashboardPeriod,
  type DashboardTicket,
  getDashboardData,
} from '@/services/admin-dashboard/getDashboardData'
import { DashboardGreeting } from './DashboardGreeting'
import { PeriodSelector } from './PeriodSelector'
import styles from './DashboardView.module.css'

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value)
const formatCurrency = (value: number) => `Rs ${formatNumber(value)}`
const statusLabel = (status: string) =>
  status
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

const getChartPath = (values: number[]) => {
  const maximum = Math.max(...values, 1)
  const coordinates = values.map((value, index) => [
    4 + index * (283 / Math.max(values.length - 1, 1)),
    135 - (value / maximum) * 90,
  ])
  return {
    line: coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' '),
    coordinates,
  }
}

const getTicketIcon = (initiatorType: DashboardTicket['initiatorType']) => {
  switch (initiatorType) {
    case 'retailer':
      return Store
    case 'delivery_partner':
      return Bike
    case 'customer':
      return Users
    default:
      return CircleHelp
  }
}

const getTicketStatusMeta = (status: DashboardTicket['status']) => {
  switch (status) {
    case 'open':
      return { label: 'Open', tone: 'red' as const }
    case 'pending':
      return { label: 'In Progress', tone: 'orange' as const }
    case 'resolved':
      return { label: 'Resolved', tone: 'green' as const }
    case 'closed':
      return { label: 'Closed', tone: 'green' as const }
    default:
      return { label: status, tone: 'orange' as const }
  }
}

const getInitiatorLabel = (type: DashboardTicket['initiatorType']) => {
  switch (type) {
    case 'retailer':
      return 'Retailer'
    case 'delivery_partner':
      return 'Delivery Partner'
    case 'customer':
      return 'Customer'
    case 'admin':
      return 'Admin'
    default:
      return 'User'
  }
}

function SpecialMetricCard({
  label,
  value,
  change,
  comparisonLabel,
  icon: Icon,
  reportIcon: ReportIcon,
  reportText = 'View All',
  tone,
  href,
  paramKey,
  currentPeriod,
}: {
  label: string
  value: string
  change: number
  comparisonLabel: string
  icon: typeof ShoppingBag
  reportIcon: typeof Calendar
  reportText?: string
  tone: 'amber' | 'green'
  href: string
  paramKey: string
  currentPeriod: DashboardPeriod
}) {
  const isPositive = change >= 0
  const arrow = isPositive ? '↑' : '↓'
  const sign = isPositive ? '+' : ''
  const formattedChange = `${sign}${change.toFixed(1)}%`

  return (
    <section className={`${styles.specialMetric} ${styles[`special${tone}`]}`}>
      <div className={styles.specialHeader}>
        <div className={styles.specialLeft}>
          <span className={styles.specialIconBadge}>
            <Icon size={25} strokeWidth={2.2} />
          </span>
          <div className={styles.specialTitleBox}>
            <span className={styles.specialLabel}>{label}</span>
            <strong className={styles.specialValue}>{value}</strong>
          </div>
        </div>
        <PeriodSelector paramKey={paramKey} currentPeriod={currentPeriod} />
      </div>

      <div className={styles.specialChange}>
        {arrow} {formattedChange} <em>{comparisonLabel}</em>
      </div>

      <Link className={styles.specialReportLink} href={href}>
        <div className={styles.specialReportLeft}>
          <ReportIcon size={16} />
          <span>{reportText}</span>
        </div>
        <ChevronRight size={16} />
      </Link>
    </section>
  )
}

function MetricCard({
  label,
  value,
  change,
  subtext,
  icon: Icon,
  tone,
  href,
}: {
  label: string
  value: string
  change?: string
  subtext?: string
  icon: typeof ShoppingBag
  tone: 'amber' | 'green' | 'blue' | 'violet'
  href?: string
}) {
  return (
    <section className={`${styles.metric} ${styles[`metric${tone}`]}`}>
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}>
          <Icon size={27} strokeWidth={2.2} />
        </span>
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      {change && (
        <span className={styles.change}>
          ↑ {change} <em>vs Yesterday</em>
        </span>
      )}
      {subtext && <span className={styles.change}>{subtext}</span>}
      {href && (
        <Link className={styles.metricLink} href={href}>
          View All <ChevronRight size={17} />
        </Link>
      )}
    </section>
  )
}

export default async function DashboardView({
  payload,
  initPageResult,
  searchParams: rawSearchParams,
}: AdminViewServerProps) {
  const searchParams = rawSearchParams ? await rawSearchParams : null

  const getParam = (key: string): string | undefined => {
    if (searchParams && typeof searchParams === 'object' && key in searchParams) {
      const val = (searchParams as Record<string, string | string[] | undefined>)[key]
      return Array.isArray(val) ? val[0] : val
    }
    if (initPageResult?.req?.searchParams?.get) {
      return initPageResult.req.searchParams.get(key) ?? undefined
    }
    return undefined
  }

  const rawOrdersPeriod = getParam('ordersPeriod')
  const ordersPeriod: DashboardPeriod =
    rawOrdersPeriod === 'week' || rawOrdersPeriod === 'month' ? rawOrdersPeriod : 'today'

  const rawRevenuePeriod = getParam('revenuePeriod')
  const revenuePeriod: DashboardPeriod =
    rawRevenuePeriod === 'week' || rawRevenuePeriod === 'month' ? rawRevenuePeriod : 'today'

  const rawChartPeriod = getParam('chartPeriod')
  const chartPeriod: DashboardPeriod =
    rawChartPeriod === 'today' || rawChartPeriod === 'month' ? rawChartPeriod : 'week'

  const dashboard = await getDashboardData(payload, initPageResult.req, {
    ordersPeriod,
    revenuePeriod,
    chartPeriod,
  })
  const chart = getChartPath(dashboard.chartRevenue.values)

  const user = initPageResult.req.user
  const adminName = user?.name || (user?.email ? user.email.split('@')[0] : 'Admin')

  return (
    <main className={styles.dashboard}>
      <header className={styles.mobileHeader}>
        <button aria-label="Open navigation" className={styles.iconButton}>
          <LayoutGrid size={22} />
        </button>
        <label className={styles.search}>
          <Search size={18} />
          <input placeholder="Search anything..." />
        </label>
      </header>

      <div className={styles.content}>
        <section className={styles.primary}>
          <div className={styles.greeting}>
            <DashboardGreeting name={adminName} />
          </div>

          <div className={styles.metrics}>
            <SpecialMetricCard
              label="Total Orders"
              value={formatNumber(dashboard.metrics.orders.total)}
              change={dashboard.metrics.orders.change}
              comparisonLabel={dashboard.metrics.orders.comparisonLabel}
              icon={Package}
              reportIcon={Calendar}
              reportText="View All"
              tone="amber"
              href="/admin/collections/orders"
              paramKey="ordersPeriod"
              currentPeriod={dashboard.metrics.orders.period}
            />
            <SpecialMetricCard
              label="Total Revenue"
              value={formatCurrency(dashboard.metrics.revenue.total)}
              change={dashboard.metrics.revenue.change}
              comparisonLabel={dashboard.metrics.revenue.comparisonLabel}
              icon={IndianRupee}
              reportIcon={TrendingUp}
              reportText="View All"
              tone="green"
              href="/admin/collections/transactions"
              paramKey="revenuePeriod"
              currentPeriod={dashboard.metrics.revenue.period}
            />
            <MetricCard
              label="Total Users"
              value={formatNumber(dashboard.metrics.users.total)}
              subtext={`+${dashboard.metrics.users.today} Joined today`}
              icon={Users}
              tone="blue"
              href="/admin/collections/users"
            />
            <MetricCard
              label="Total Retailers"
              value={formatNumber(dashboard.metrics.retailers.total)}
              subtext={`+${dashboard.metrics.retailers.today} Joined today`}
              icon={Store}
              tone="violet"
              href="/admin/collections/retailers"
            />
            <MetricCard
              label="Total Delivery Partners"
              value={formatNumber(dashboard.metrics.deliveryPartners.total)}
              subtext={`+${dashboard.metrics.deliveryPartners.today} Joined today`}
              icon={Bike}
              tone="blue"
              href="/admin/collections/delivery-partners"
            />
          </div>

          <section className={styles.actions}>
            <h2>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <Link
                href="/admin/collections/retailers?where[approvalStatus][equals]=pending"
                className={styles.action}
              >
                <Users size={20} />
                <div>
                  <b>Approve Retailers</b>
                  <small>{dashboard.pendingApprovals.retailers} pending</small>
                </div>
                <ChevronRight size={16} />
              </Link>
              <Link
                href="/admin/collections/delivery-partners?where[approvalStatus][equals]=pending"
                className={styles.action}
              >
                <Bike size={20} />
                <div>
                  <b>Approve Delivery Partners</b>
                  <small>{dashboard.pendingApprovals.deliveryPartners} pending</small>
                </div>
                <ChevronRight size={16} />
              </Link>
              <Link href="/admin/collections/products/create" className={styles.action}>
                <PackageCheck size={20} />
                <div>
                  <b>Add Product</b>
                  <small>Create new item</small>
                </div>
                <ChevronRight size={16} />
              </Link>
              <Link href="/admin/collections/categories/create" className={styles.action}>
                <LayoutGrid size={20} />
                <div>
                  <b>Add Category</b>
                  <small>Create category</small>
                </div>
                <ChevronRight size={16} />
              </Link>
            </div>
          </section>

          <section className={styles.recentOrders}>
            <div className={styles.sectionHeading}>
              <h2>Recent Orders</h2>
              <Link href="/admin/collections/orders">
                View All Orders <ChevronRight size={16} />
              </Link>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Retailer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                        No orders placed yet
                      </td>
                    </tr>
                  ) : (
                    dashboard.recentOrders.map((order) => {
                      const label = statusLabel(order.status)
                      return (
                        <tr key={order.id}>
                          <td>
                            <Link
                              href={`/admin/collections/orders/${order.id}`}
                              className={styles.orderIdLink}
                              title={`View order #${order.id}`}
                            >
                              #{order.id.slice(0, 8).toUpperCase()}
                            </Link>
                          </td>
                          <td>{order.customer}</td>
                          <td>{order.retailer}</td>
                          <td>
                            <b>{formatCurrency(order.amount)}</b>
                          </td>
                          <td>
                            <span
                              className={`${styles.status} ${styles[`status${label.replaceAll(' ', '')}`]}`}
                            >
                              {label}
                            </span>
                          </td>
                          <td>{timeAgo(order.createdAt)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <footer>
              <span>Showing the 5 most recent orders</span>
              <Link href="/admin/collections/orders">
                View All Orders <ChevronRight size={16} />
              </Link>
            </footer>
          </section>
        </section>

        <aside className={styles.sidebar}>
          <section className={styles.tickets}>
            <div className={styles.sectionHeading}>
              <h2>Support Tickets</h2>
              <Link href="/admin/collections/support-chats">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className={styles.ticketCounts}>
              <div>
                <b>{dashboard.supportTickets.counts.open}</b>
                <span>Open</span>
              </div>
              <div>
                <b>{dashboard.supportTickets.counts.inProgress}</b>
                <span>In Progress</span>
              </div>
              <div>
                <b>{dashboard.supportTickets.counts.resolved}</b>
                <span>Resolved</span>
              </div>
            </div>
            <h3>Recent Tickets</h3>
            <div className={styles.ticketList}>
              {dashboard.supportTickets.recent.length === 0 ? (
                <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: '12px' }}>
                  No support tickets yet
                </p>
              ) : (
                dashboard.supportTickets.recent.map((ticket) => {
                  const Icon = getTicketIcon(ticket.initiatorType)
                  const { label: statusText, tone } = getTicketStatusMeta(ticket.status)
                  const initiator = getInitiatorLabel(ticket.initiatorType)
                  return (
                    <Link
                      href={`/admin/collections/support-chats/${ticket.id}`}
                      className={styles.ticket}
                      key={ticket.id}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span className={`${styles.ticketIcon} ${styles[`ticket${tone}`]}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <b>{ticket.heading}</b>
                        <small>{`${initiator} - ${timeAgo(ticket.createdAt)}`}</small>
                      </div>
                      <span className={`${styles.ticketState} ${styles[`ticketState${tone}`]}`}>
                        {statusText}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </section>

          <section className={styles.revenue}>
            <div className={styles.sectionHeading}>
              <h2>Revenue Overview</h2>
              <PeriodSelector
                paramKey="chartPeriod"
                currentPeriod={dashboard.chartRevenue.period}
                defaultPeriod="week"
              />
            </div>
            <p>Total Revenue</p>
            <strong>
              {formatCurrency(dashboard.chartRevenue.total)}
            </strong>
            <span className={styles.change}>
              Live <em>{dashboard.chartRevenue.subtext}</em>
            </span>
            <svg className={styles.revenueChart} viewBox="0 0 292 160" role="img" aria-label="Revenue overview trend">
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#16892d" stopOpacity=".22" />
                  <stop offset="1" stopColor="#16892d" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${chart.line} L287 150 L4 150 Z`} fill="url(#revenue-fill)" />
              <path
                d={chart.line}
                fill="none"
                stroke="#16892d"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chart.coordinates.map(([cx, cy]) => (
                <circle key={cx} cx={cx} cy={cy} r="4.5" fill="#16892d" />
              ))}
            </svg>
            <div className={styles.chartDays}>
              {dashboard.chartRevenue.labels.map((label, idx) => (
                <span key={`${label}-${idx}`}>{label}</span>
              ))}
            </div>
            <Link href="/admin/collections/transactions">
              View All <ChevronRight size={16} />
            </Link>
          </section>

          <section className={styles.help}>
            <CircleHelp size={22} />
            <div>
              <b>Need Help?</b>
              <small>Contact support team</small>
            </div>
            <ChevronRight size={17} />
          </section>
        </aside>
      </div>
    </main>
  )
}
