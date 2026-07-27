'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Loader2, List, LayoutGrid, Search } from 'lucide-react'

import styles from './ApprovalManagementView.module.css'

type ApprovalDoc = {
  id?: string | number
  approvalStatus?: string
  shopName?: string
  ownerName?: string
  fullName?: string
  emailId?: string
  email?: string
  mobileNumber?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

type ApprovalManagementViewProps = {
  data?: {
    docs?: ApprovalDoc[]
    totalDocs?: number
  }
  collectionConfig?: {
    slug?: string
    admin?: {
      useAsTitle?: string
    }
  }
  collectionSlug?: string
  query?: Record<string, unknown>
}

const statusMeta = {
  all: { label: 'All Records', tone: 'violet' },
  pending: { label: 'Pending', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'rose' },
  suspended: { label: 'Suspended', tone: 'blue' },
} as const

const labelForStatus = (status?: string) => {
  if (!status) return 'Pending Review'
  const matched = statusMeta[status as keyof typeof statusMeta]
  return matched?.label ?? status
}

const toneForStatus = (status?: string) => {
  if (!status) return 'amber'
  const matched = statusMeta[status as keyof typeof statusMeta]
  return matched?.tone ?? 'violet'
}

const formatDate = (value?: string) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const getTitle = (collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') {
    return 'Delivery Partners Directory'
  }

  return 'Retailers Directory'
}

const getDescription = (collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') {
    return 'Browse full list of registered delivery partners, filter by status, and review approvals.'
  }

  return 'Browse full list of registered retailers, filter by status, and review approvals.'
}

const getPrimaryField = (doc: ApprovalDoc, collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') {
    return doc.fullName ?? 'Unnamed delivery partner'
  }

  return doc.shopName ?? doc.ownerName ?? 'Unnamed retailer'
}

const getSecondaryField = (doc: ApprovalDoc, collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') {
    return doc.email ?? doc.mobileNumber ?? 'No contact details'
  }

  return doc.ownerName ?? doc.emailId ?? doc.mobileNumber ?? 'No contact details'
}

export default function ApprovalManagementView(props: ApprovalManagementViewProps) {
  const searchParams = useSearchParams()
  const collectionSlug = props.collectionSlug ?? props.collectionConfig?.slug ?? 'retailers'

  // Extract search param filter
  const rawStatus = searchParams?.get('where[approvalStatus][equals]') || searchParams?.get('approvalStatus')
  const initialFilter = (rawStatus && rawStatus in statusMeta) ? rawStatus : 'all'

  // Local state for active filter tab, view mode, and search
  const [currentFilter, setCurrentFilter] = useState<string>(initialFilter)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [allDocs, setAllDocs] = useState<ApprovalDoc[]>(props.data?.docs ?? [])
  const [totalRequestsCount, setTotalRequestsCount] = useState<number>(props.data?.totalDocs ?? props.data?.docs?.length ?? 0)
  const [updatingId, setUpdatingId] = useState<string | number | null>(null)
  const [statusCounts, setStatusCounts] = useState<{ pending: number; approved: number; rejected: number; suspended: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  })

  // Sync initial filter if URL changes
  useEffect(() => {
    if (rawStatus && rawStatus in statusMeta) {
      setCurrentFilter(rawStatus)
    } else {
      setCurrentFilter('all')
    }
  }, [rawStatus])

  // Fetch full collection documents once to calculate global counts & enable instant client filtering
  useEffect(() => {
    if (!collectionSlug) return
    let isSubscribed = true

    fetch(`/api/${collectionSlug}?limit=1000&depth=1`)
      .then((res) => res.json())
      .then((data) => {
        if (!isSubscribed || !data?.docs) return
        const docsList: ApprovalDoc[] = data.docs
        setAllDocs(docsList)
        setTotalRequestsCount(data.totalDocs ?? docsList.length)

        const counts = docsList.reduce<{ pending: number; approved: number; rejected: number; suspended: number }>(
          (acc, doc) => {
            const status = (doc.approvalStatus ?? 'pending') as keyof typeof acc
            if (status in acc) {
              acc[status] = (acc[status] ?? 0) + 1
            }
            return acc
          },
          { pending: 0, approved: 0, rejected: 0, suspended: 0 },
        )
        setStatusCounts(counts)
      })
      .catch((err) => {
        console.error('Error fetching approval collection stats:', err)
      })

    return () => {
      isSubscribed = false
    }
  }, [collectionSlug])

  // Handler to approve or reject a request card directly
  const handleStatusUpdate = async (docId: string | number, newStatus: 'approved' | 'rejected') => {
    setUpdatingId(docId)
    try {
      const res = await fetch(`/api/${collectionSlug}/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalStatus: newStatus,
        }),
      })

      if (res.ok) {
        // Update local item status in allDocs
        const currentDoc = allDocs.find((d) => d.id === docId)
        const oldStatus = (currentDoc?.approvalStatus ?? 'pending') as keyof typeof statusCounts

        setAllDocs((prevDocs) =>
          prevDocs.map((doc) =>
            doc.id === docId ? { ...doc, approvalStatus: newStatus } : doc,
          ),
        )

        // Update counts
        setStatusCounts((prev) => ({
          ...prev,
          [oldStatus]: Math.max(0, (prev[oldStatus] || 1) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1,
        }))
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Failed to update status: ${errData?.errors?.[0]?.message || 'Unknown error'}`)
      }
    } catch (e: any) {
      alert(`Error updating status: ${e?.message || e}`)
    } finally {
      setUpdatingId(null)
    }
  }

  // Use allDocs if loaded, otherwise fall back to props docs
  const sourceDocs = allDocs.length > 0 ? allDocs : (props.data?.docs ?? [])
  const filteredDocs = currentFilter === 'all'
    ? sourceDocs
    : sourceDocs.filter((doc) => (doc.approvalStatus ?? 'pending') === currentFilter)

  // Real-time search filter
  const displayedDocs = filteredDocs.filter((doc) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase().trim()
    const primary = getPrimaryField(doc, collectionSlug).toLowerCase()
    const secondary = getSecondaryField(doc, collectionSlug).toLowerCase()
    const phone = String(doc.mobileNumber ?? '').toLowerCase()
    const status = (doc.approvalStatus ?? '').toLowerCase()
    return primary.includes(query) || secondary.includes(query) || phone.includes(query) || status.includes(query)
  })

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin management workspace</p>
          <h1>{getTitle(collectionSlug)}</h1>
          <p className={styles.description}>{getDescription(collectionSlug)}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.summaryCard}>
            <span>{totalRequestsCount}</span>
            <small>Total records</small>
          </div>
          <div className={styles.viewModeGroup}>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.active : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List size={14} /> All Records (Table)
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === 'cards' ? styles.active : ''}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={14} /> Queue Cards
            </button>
          </div>
        </div>
      </header>

      <section className={styles.filters} aria-label="Approval status filters">
        <button
          type="button"
          className={`${styles.filterChip} ${currentFilter === 'all' ? styles.active : ''}`}
          onClick={() => setCurrentFilter('all')}
        >
          All Records <span>{totalRequestsCount}</span>
        </button>
        {(['pending', 'approved', 'rejected', 'suspended'] as const).map((status) => (
          <button
            type="button"
            key={status}
            className={`${styles.filterChip} ${currentFilter === status ? styles.active : ''}`}
            onClick={() => setCurrentFilter(status)}
          >
            {labelForStatus(status)} <span>{statusCounts[status] ?? 0}</span>
          </button>
        ))}
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>{labelForStatus(currentFilter === 'all' ? undefined : currentFilter)}</h2>
            <p>{displayedDocs.length} record{displayedDocs.length === 1 ? '' : 's'} showing</p>
          </div>
          <div className={styles.searchWrap}>
            <Search size={16} style={{ color: '#64748b' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${collectionSlug}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {currentFilter !== 'all' && (
              <button
                type="button"
                className={styles.reviewLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8 }}
                onClick={() => setCurrentFilter('all')}
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {displayedDocs.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No records found.</h3>
            <p>Try clearing your search or switching to another status queue.</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{collectionSlug === 'delivery-partners' ? 'Partner Name' : 'Shop / Store Name'}</th>
                  <th>{collectionSlug === 'delivery-partners' ? 'Contact Email' : 'Owner Name'}</th>
                  <th>Mobile Number</th>
                  <th>{collectionSlug === 'delivery-partners' ? 'Vehicle Details' : 'GST Number'}</th>
                  <th>Approval Status</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDocs.map((doc) => {
                  const status = (doc.approvalStatus ?? 'pending') as string
                  const tone = toneForStatus(status)
                  const isPending = status === 'pending'
                  const isUpdating = updatingId === doc.id

                  return (
                    <tr key={doc.id}>
                      <td>
                        <b>{getPrimaryField(doc, collectionSlug)}</b>
                      </td>
                      <td>{getSecondaryField(doc, collectionSlug)}</td>
                      <td>{String(doc.mobileNumber ?? '—')}</td>
                      <td>
                        {collectionSlug === 'delivery-partners'
                          ? String(doc.vehicleBrand ?? doc.vehicleType ?? '—')
                          : String(doc.gstNumber ?? '—')}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[tone]}`}>
                          {labelForStatus(status)}
                        </span>
                      </td>
                      <td>{formatDate(doc.createdAt as string | undefined)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className={styles.actionGroup} style={{ justifyContent: 'flex-end' }}>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className={styles.approveBtn}
                                disabled={isUpdating}
                                onClick={() => doc.id && handleStatusUpdate(doc.id, 'approved')}
                              >
                                {isUpdating ? <Loader2 size={12} className={styles.spin} /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                type="button"
                                className={styles.rejectBtn}
                                disabled={isUpdating}
                                onClick={() => doc.id && handleStatusUpdate(doc.id, 'rejected')}
                              >
                                {isUpdating ? <Loader2 size={12} className={styles.spin} /> : <X size={12} />}
                                Reject
                              </button>
                            </>
                          )}
                          <Link className={styles.reviewLink} href={`/admin/collections/${collectionSlug}/${doc.id}`}>
                            Edit details &rarr;
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.requestList}>
            {displayedDocs.map((doc) => {
              const status = (doc.approvalStatus ?? 'pending') as string
              const tone = toneForStatus(status)
              const isPending = status === 'pending'
              const isUpdating = updatingId === doc.id

              return (
                <article key={doc.id} className={styles.requestItem}>
                  <div className={styles.requestMain}>
                    <div>
                      <h3>{getPrimaryField(doc, collectionSlug)}</h3>
                      <p>{getSecondaryField(doc, collectionSlug)}</p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[tone]}`}>{labelForStatus(status)}</span>
                  </div>
                  <div className={styles.requestMeta}>
                    <span>Created {formatDate(doc.createdAt as string | undefined)}</span>
                    <span>Updated {formatDate(doc.updatedAt as string | undefined)}</span>
                    <span>Phone {String(doc.mobileNumber ?? '—')}</span>
                  </div>
                  <div className={styles.requestActions}>
                    {isPending && (
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.approveBtn}
                          disabled={isUpdating}
                          onClick={() => doc.id && handleStatusUpdate(doc.id, 'approved')}
                        >
                          {isUpdating ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
                          Approve
                        </button>
                        <button
                          type="button"
                          className={styles.rejectBtn}
                          disabled={isUpdating}
                          onClick={() => doc.id && handleStatusUpdate(doc.id, 'rejected')}
                        >
                          {isUpdating ? <Loader2 size={14} className={styles.spin} /> : <X size={14} />}
                          Reject
                        </button>
                      </div>
                    )}
                    <Link className={styles.reviewLink} href={`/admin/collections/${collectionSlug}/${doc.id}`}>
                      Review details &rarr;
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
