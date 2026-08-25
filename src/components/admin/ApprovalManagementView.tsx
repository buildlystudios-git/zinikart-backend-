'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Store, Truck, Users, Clock, Ban, ArrowUpRight, Search, ChevronRight, ChevronLeft, Check, X } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'

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
  shopAddress?: {
    city?: string
    state?: string
  }
  vehicleType?: string
  vehicleBrand?: string
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

const formatDateTime = (value?: string) => {
  if (!value) return { date: '—', time: '' }
  const dateObj = new Date(value)
  if (Number.isNaN(dateObj.getTime())) return { date: '—', time: '' }
  
  const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateObj)
  const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dateObj)
  return { date, time }
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const getPrimaryField = (doc: ApprovalDoc, collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') return doc.fullName ?? 'Unnamed Partner'
  return doc.shopName ?? doc.ownerName ?? 'Unnamed Retailer'
}

const getSecondaryField = (doc: ApprovalDoc, collectionSlug?: string) => {
  if (collectionSlug === 'delivery-partners') return doc.email ?? doc.mobileNumber ?? '—'
  return doc.ownerName ?? doc.emailId ?? '—'
}

export default function ApprovalManagementView(props: ApprovalManagementViewProps) {
  const searchParams = useSearchParams()
  const collectionSlug = props.collectionSlug ?? props.collectionConfig?.slug ?? 'retailers'
  const isDelivery = collectionSlug === 'delivery-partners'

  const rawStatus = searchParams?.get('where[approvalStatus][equals]') || searchParams?.get('approvalStatus')
  const initialFilter = rawStatus ? rawStatus : 'all'

  const { setStepNav } = useStepNav()

  const [currentFilter, setCurrentFilter] = useState<string>(initialFilter)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOption, setSortOption] = useState<string>('newest')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [allDocs, setAllDocs] = useState<ApprovalDoc[]>(props.data?.docs ?? [])
  const [totalCount, setTotalCount] = useState<number>(props.data?.totalDocs ?? props.data?.docs?.length ?? 0)
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0, suspended: 0 })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const itemsPerPage = 10

  // Set Payload CMS native breadcrumb (StepNav)
  useEffect(() => {
    setStepNav([
      {
        label: isDelivery ? 'Delivery Partners' : 'Retailers',
      },
    ])
  }, [setStepNav, isDelivery])

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [currentFilter, searchQuery, sortOption])

  useEffect(() => {
    if (rawStatus) {
      setCurrentFilter(rawStatus)
    } else {
      setCurrentFilter('all')
    }
  }, [rawStatus])

  useEffect(() => {
    if (!collectionSlug) return
    let isSubscribed = true

    fetch(`/api/${collectionSlug}?limit=1000&depth=1`)
      .then((res) => res.json())
      .then((data) => {
        if (!isSubscribed || !data?.docs) return
        const docsList: ApprovalDoc[] = data.docs
        setAllDocs(docsList)
        setTotalCount(data.totalDocs ?? docsList.length)

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

  const sourceDocs = allDocs.length > 0 ? allDocs : (props.data?.docs ?? [])
  const filteredDocs = currentFilter === 'all'
    ? sourceDocs
    : currentFilter === 'suspended' // treat suspended as "blocked" which could include rejected
      ? sourceDocs.filter(doc => doc.approvalStatus === 'suspended' || doc.approvalStatus === 'rejected')
      : sourceDocs.filter((doc) => (doc.approvalStatus ?? 'pending') === currentFilter)

  const displayedDocs = useMemo(() => {
    let result = filteredDocs.filter((doc) => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase().trim()
      const primary = getPrimaryField(doc, collectionSlug).toLowerCase()
      const secondary = getSecondaryField(doc, collectionSlug).toLowerCase()
      const phone = String(doc.mobileNumber ?? '').toLowerCase()
      return primary.includes(query) || secondary.includes(query) || phone.includes(query)
    })

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime()
      const dateB = new Date(b.createdAt ?? 0).getTime()
      return sortOption === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [filteredDocs, searchQuery, sortOption, collectionSlug])

  const paginatedDocs = displayedDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(displayedDocs.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    setActionLoading(String(id))
    try {
      const res = await fetch(`/api/${collectionSlug}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: newStatus })
      })
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`)
        setAllDocs(prev => prev.map(doc => doc.id === id ? { ...doc, approvalStatus: newStatus } : doc))
        setStatusCounts(prev => {
          const oldStatus = allDocs.find(d => d.id === id)?.approvalStatus || 'pending'
          return {
            ...prev,
            [oldStatus]: Math.max(0, prev[oldStatus as keyof typeof prev] - 1),
            [newStatus]: prev[newStatus as keyof typeof prev] + 1
          }
        })
      } else {
        toast.error('Failed to update status')
      }
    } catch (err) {
      toast.error('Error updating status')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className={`${styles.statusBadge} ${styles.pendingReview}`}>Pending Review</span>
      case 'approved': return <span className={`${styles.statusBadge} ${styles.new}`}>Approved</span>
      case 'rejected': return <span className={`${styles.statusBadge} ${styles.rejected}`}>Rejected</span>
      case 'suspended': return <span className={`${styles.statusBadge} ${styles.suspended}`}>Blocked</span>
      default: return <span className={`${styles.statusBadge} ${styles.new}`}>New</span>
    }
  }

  const getSectionTitle = () => {
    if (currentFilter === 'pending') return 'New Requests'
    if (currentFilter === 'approved') return 'Active'
    if (currentFilter === 'suspended') return 'Blocked'
    return 'All Records'
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1>{isDelivery ? 'Delivery Partner Management' : 'Retailer Management'}</h1>
          <p className={styles.description}>Manage {isDelivery ? 'delivery partner' : 'retailer'} registrations, approvals and account status.</p>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${currentFilter === 'all' ? styles.active : ''}`} onClick={() => setCurrentFilter('all')}>
          <div className={`${styles.kpiIconWrapper} ${styles.green}`}>
            {isDelivery ? <Truck size={24} /> : <Store size={24} />}
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total {isDelivery ? 'Partners' : 'Retailers'}</span>
            <span className={styles.kpiValue}>{totalCount.toLocaleString()}</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${currentFilter === 'approved' ? styles.active : ''}`} onClick={() => setCurrentFilter('approved')}>
          <div className={`${styles.kpiIconWrapper} ${styles.blue}`}>
            <Users size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Active {isDelivery ? 'Partners' : 'Retailers'}</span>
            <span className={styles.kpiValue}>{statusCounts.approved.toLocaleString()}</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${currentFilter === 'pending' ? styles.active : ''}`} onClick={() => setCurrentFilter('pending')}>
          <div className={`${styles.kpiIconWrapper} ${styles.orange}`}>
            <Clock size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>New Requests</span>
            <span className={styles.kpiValue}>{statusCounts.pending.toLocaleString()}</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${currentFilter === 'suspended' ? styles.active : ''}`} onClick={() => setCurrentFilter('suspended')}>
          <div className={`${styles.kpiIconWrapper} ${styles.red}`}>
            <Ban size={24} />
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Blocked {isDelivery ? 'Partners' : 'Retailers'}</span>
            <span className={styles.kpiValue}>{(statusCounts.suspended + statusCounts.rejected).toLocaleString()}</span>
          </div>
        </div>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <div>
            <h2>{getSectionTitle()}</h2>
            <p>Review and take action on {isDelivery ? 'partner' : 'retailer'} registration requests.</p>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableControls}>
            <div className={styles.searchWrap}>
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Search ${isDelivery ? 'partner' : 'retailer'} by name, owner or city...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.controlsRight}>
              <div className={styles.sortWrap}>
                Sort by
                <select className={styles.sortSelect} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            {paginatedDocs.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No records found</h3>
                <p>Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>{isDelivery ? 'PARTNER NAME' : 'RETAILER NAME'}</th>
                    <th>{isDelivery ? 'CONTACT EMAIL' : 'OWNER NAME'}</th>
                    <th>DATE OF JOINING</th>
                    <th>{isDelivery ? 'VEHICLE' : 'CITY'}</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDocs.map((doc, idx) => {
                    const primaryName = getPrimaryField(doc, collectionSlug)
                    const { date, time } = formatDateTime(doc.createdAt)
                    const avatarColors = ['green', 'blue', 'orange', 'yellow', 'red']
                    const avatarColor = avatarColors[idx % avatarColors.length]
                    
                    const docIdStr = String(doc.id || '')
                    const displayId = docIdStr.length > 8 ? docIdStr.substring(0, 8) : docIdStr

                    return (
                      <tr key={doc.id}>
                        <td>
                          <div className={styles.avatarCell}>
                            <div className={`${styles.avatar} ${styles[avatarColor]}`}>
                              {getInitials(primaryName)}
                            </div>
                            <div className={styles.stackedText}>
                              <span className={styles.primaryText}>{primaryName}</span>
                              {displayId && <span className={styles.secondaryText}>#{displayId}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.primaryText}>{getSecondaryField(doc, collectionSlug)}</span>
                        </td>
                        <td>
                          <div className={styles.stackedText}>
                            <span className={styles.primaryText}>{date}</span>
                            <span className={styles.secondaryText}>{time}</span>
                          </div>
                        </td>
                        <td>
                          {isDelivery ? (
                            <div className={styles.stackedText}>
                              <span className={styles.primaryText}>{doc.vehicleBrand || 'Unknown'}</span>
                              <span className={styles.secondaryText}>{doc.vehicleType || '—'}</span>
                            </div>
                          ) : (
                            <div className={styles.stackedText}>
                              <span className={styles.primaryText}>{doc.shopAddress?.city || '—'},</span>
                              <span className={styles.secondaryText}>{doc.shopAddress?.state || '—'}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getStatusBadge(doc.approvalStatus || 'pending')}
                            {(isDelivery && doc.onlineStatus) ? (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} title="Online"></span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {doc.approvalStatus === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(doc.id!, 'approved')}
                                  disabled={actionLoading === String(doc.id)}
                                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: actionLoading === String(doc.id) ? 0.5 : 1 }}
                                  title="Approve"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(doc.id!, 'rejected')}
                                  disabled={actionLoading === String(doc.id)}
                                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: actionLoading === String(doc.id) ? 0.5 : 1 }}
                                  title="Reject"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <Link href={`/admin/collections/${collectionSlug}/${doc.id}`} className={styles.viewDetailsBtn}>
                              View Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {displayedDocs.length > itemsPerPage && (
            <div className={styles.pagination}>
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, displayedDocs.length)} of {displayedDocs.length} requests</span>
              <div className={styles.pageControls}>
                <button 
                  className={styles.pageBtn} 
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  // Simple pagination: show first, last, current, and adjacent
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button 
                        key={page}
                        className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page}>...</span>
                  }
                  return null;
                })}
                <button 
                  className={styles.pageBtn} 
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
