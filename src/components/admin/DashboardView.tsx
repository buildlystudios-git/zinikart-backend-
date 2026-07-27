import {
  Bell,
  Bike,
  Boxes,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  EllipsisVertical,
  IndianRupee,
  LayoutGrid,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Store,
  TicketCheck,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react'
import Link from 'next/link'
import type { Payload, PayloadRequest } from 'payload'

import { getDashboardData } from '@/services/admin-dashboard/getDashboardData'
import styles from './DashboardView.module.css'

const tickets = [
  ['Order Pickup Delay', 'Retailer - 8 mins ago', 'Open', 'red'],
  ['Payment Issue', 'User - 15 mins ago', 'In Progress', 'orange'],
  ['Unable to Add Product', 'Retailer - 32 mins ago', 'Open', 'red'],
  ['Delivery Partner Delay', 'User - 1 hour ago', 'Resolved', 'green'],
  ['Wrong Item Delivered', 'User - 2 hours ago', 'In Progress', 'orange'],
] as const

const ticketIcon = [Users, WalletCards, Boxes, Bike, PackageCheck]

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value)
const formatCurrency = (value: number) => `Rs ${formatNumber(value)}`
const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
const statusLabel = (status: string) => status.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

const getChartPath = (values: number[]) => {
  const maximum = Math.max(...values, 1)
  const coordinates = values.map((value, index) => [4 + index * (283 / Math.max(values.length - 1, 1)), 135 - (value / maximum) * 90])
  return { line: coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' '), coordinates }
}

function SpecialMetricCard({
  label,
  value,
  change,
  icon: Icon,
  reportIcon: ReportIcon,
  reportText,
  tone,
  href,
}: {
  label: string
  value: string
  change: string
  icon: typeof ShoppingBag
  reportIcon: typeof Calendar
  reportText: string
  tone: 'amber' | 'green'
  href: string
}) {
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
        <div className={styles.specialDropdownWrap}>
          <select className={styles.timeDropdown} defaultValue="today">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <ChevronDown size={14} className={styles.dropdownChevron} />
        </div>
      </div>

      <div className={styles.specialChange}>
        ↑ {change} <em>vs Yesterday</em>
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
        <span className={styles.metricIcon}><Icon size={27} strokeWidth={2.2} /></span>
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      {change && <span className={styles.change}>↑ {change} <em>vs Yesterday</em></span>}
      {subtext && <span className={styles.change}>{subtext}</span>}
      {href && <Link className={styles.metricLink} href={href}>View detailed report <ChevronRight size={17} /></Link>}
    </section>
  )
}

export default async function DashboardView({
  payload,
  initPageResult,
}: {
  payload: Payload
  initPageResult: { req: PayloadRequest }
}) {
  const dashboard = await getDashboardData(payload, initPageResult.req)
  const chart = getChartPath(dashboard.weeklyRevenue)

  return (
    <main className={styles.dashboard}>
      <header className={styles.mobileHeader}>
        <button aria-label="Open navigation" className={styles.iconButton}><LayoutGrid size={22} /></button>
        <label className={styles.search}><Search size={18} /><input placeholder="Search anything..." /></label>
        <button aria-label="Notifications" className={styles.iconButton}><Bell size={21} /><b>6</b></button>
      </header>

      <div className={styles.content}>
        <section className={styles.primary}>
          <div className={styles.greeting}>
            <div><h1>Good Morning, Admin <span>👋</span></h1><p>Here&apos;s what&apos;s happening with ZiniKart today.</p></div>
          </div>

          <div className={styles.metrics}>
            <SpecialMetricCard
              label="Total Orders"
              value={formatNumber(dashboard.metrics.orders.total)}
              change={formatChange(dashboard.metrics.orders.change)}
              icon={Package}
              reportIcon={Calendar}
              reportText="View detailed orders report"
              tone="amber"
              href="/admin/collections/orders"
            />
            <SpecialMetricCard
              label="Total Revenue"
              value={formatCurrency(dashboard.metrics.revenue.total)}
              change={formatChange(dashboard.metrics.revenue.change)}
              icon={IndianRupee}
              reportIcon={TrendingUp}
              reportText="View detailed revenue report"
              tone="green"
              href="/admin/collections/transactions"
            />
            <MetricCard label="Total Users" value={formatNumber(dashboard.metrics.users.total)} subtext={`+${dashboard.metrics.users.today} Joined today`} icon={Users} tone="blue" />
            <MetricCard label="Total Retailers" value={formatNumber(dashboard.metrics.retailers.total)} subtext={`+${dashboard.metrics.retailers.today} Joined today`} icon={Store} tone="violet" />
            <MetricCard label="Total Delivery Partners" value={formatNumber(dashboard.metrics.deliveryPartners.total)} subtext={`+${dashboard.metrics.deliveryPartners.today} Joined today`} icon={Bike} tone="blue" />
          </div>

          <section className={styles.actions}>
            <h2>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <Link href="/admin/collections/retailers?where[approvalStatus][equals]=pending" className={styles.action}>
                <Users size={20} />
                <div><b>Approve Retailers</b><small>{dashboard.pendingApprovals.retailers} pending</small></div>
                <ChevronRight size={16} />
              </Link>
              <Link href="/admin/collections/delivery-partners?where[approvalStatus][equals]=pending" className={styles.action}>
                <Bike size={20} />
                <div><b>Approve Delivery Partners</b><small>{dashboard.pendingApprovals.deliveryPartners} pending</small></div>
                <ChevronRight size={16} />
              </Link>
              <Link href="/admin/collections/products/create" className={styles.action}>
                <PackageCheck size={20} />
                <div><b>Add Product</b><small>Create new item</small></div>
                <ChevronRight size={16} />
              </Link>
              <Link href="/admin/collections/categories/create" className={styles.action}>
                <LayoutGrid size={20} />
                <div><b>Add Category</b><small>Create category</small></div>
                <ChevronRight size={16} />
              </Link>
            </div>
          </section>

          <section className={styles.recentOrders}>
            <div className={styles.sectionHeading}><h2>Recent Orders</h2><Link href="/admin/collections/orders">View All Orders <ChevronRight size={16} /></Link></div>
            <div className={styles.tableWrap}><table><thead><tr><th>Order ID</th><th>Customer</th><th>Retailer</th><th>Amount</th><th>Status</th><th>Time</th><th>Action</th></tr></thead><tbody>
              {dashboard.recentOrders.map((order) => { const label = statusLabel(order.status); return <tr key={order.id}><td><b>#{order.id.slice(0, 8).toUpperCase()}</b></td><td>{order.customer}</td><td>{order.retailer}</td><td><b>{formatCurrency(order.amount)}</b></td><td><span className={`${styles.status} ${styles[`status${label.replaceAll(' ', '')}`]}`}>{label}</span></td><td>{timeAgo(order.createdAt)}</td><td><Link aria-label={`Open order ${order.id}`} href={`/admin/collections/orders/${order.id}`} className={styles.more}><EllipsisVertical size={18} /></Link></td></tr> })}
            </tbody></table></div>
            <footer><span>Showing the 5 most recent orders</span><Link href="/admin/collections/orders">View All Orders <ChevronRight size={16} /></Link></footer>
          </section>
        </section>

        <aside className={styles.sidebar}>
          <section className={styles.tickets}>
            <div className={styles.sectionHeading}><h2>Support Tickets</h2><a href="#support">View All <ChevronRight size={16} /></a></div>
            <div className={styles.ticketCounts}><div><b>18</b><span>Open</span></div><div><b>7</b><span>In Progress</span></div><div><b>12</b><span>Resolved</span></div></div>
            <h3>Recent Tickets</h3>
            <div className={styles.ticketList}>{tickets.map(([title, info, state, tone], index) => { const Icon = ticketIcon[index]; return <div className={styles.ticket} key={title}><span className={`${styles.ticketIcon} ${styles[`ticket${tone}`]}`}><Icon size={18} /></span><div><b>{title}</b><small>{info}</small></div><span className={`${styles.ticketState} ${styles[`ticketState${tone}`]}`}>{state}</span></div> })}</div>
          </section>
          <section className={styles.revenue}>
            <div className={styles.sectionHeading}><h2>Revenue Overview</h2></div>
            <p>Total Revenue</p><strong>{formatCurrency(dashboard.weeklyRevenue.reduce((total, amount) => total + amount, 0))}</strong><span className={styles.change}>Live <em>last 7 days</em></span>
            <svg viewBox="0 0 292 160" role="img" aria-label="Weekly revenue trend"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#16892d" stopOpacity=".22"/><stop offset="1" stopColor="#16892d" stopOpacity="0"/></linearGradient></defs><path d={`${chart.line} L287 150 L4 150 Z`} fill="url(#revenue-fill)"/><path d={chart.line} fill="none" stroke="#16892d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{chart.coordinates.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="4.5" fill="#16892d" />)}</svg>
            <div className={styles.chartDays}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span key={day}>{day}</span>)}</div><a href="#revenue">View Detailed Report <ChevronRight size={16} /></a>
          </section>
          <section className={styles.help}><CircleHelp size={22} /><div><b>Need Help?</b><small>Contact support team</small></div><ChevronRight size={17} /></section>
        </aside>
      </div>
    </main>
  )
}
