'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'
import Link from 'next/link'
import { SectionCard } from '../ui/SectionCard'
import { Tooltip } from '../ui/Tooltip'
import { SelectField } from '../ui/SelectField'
import styles from './OrderEditView.module.css'
import { ORDER_STATUS_OPTIONS } from '@/constants/orderStatuses'

// Helper for status badge colors
const getStatusColorClass = (status: string) => {
  switch (status) {
    case 'delivered':
    case 'cod_payment_received':
      return styles.statusGreen
    case 'placed':
    case 'order_received':
    case 'preparing':
    case 'packed':
      return styles.statusBlue
    case 'ready_for_pickup':
    case 'picked_up':
    case 'out_for_delivery':
    case 'reached_location':
      return styles.statusYellow
    case 'cancelled':
      return styles.statusRed
    default:
      return styles.statusGray
  }
}

// Format currency
const formatCurrency = (amount: number | null | undefined, currency: string = 'INR') => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

// Format date
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

export default function OrderEditView() {
  const pathname = usePathname()
  const router = useRouter()
  const { setStepNav } = useStepNav()
  
  // Extract ID from pathname: /admin/collections/orders/[id]
  const pathParts = pathname.split('/')
  const idStr = pathParts[pathParts.length - 1]
  const isEditing = idStr !== 'create'
  const orderId = isEditing ? idStr : null

  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [order, setOrder] = useState<any>(null)
  
  // Editable state
  const [status, setStatus] = useState<string>('placed')

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    } else {
      setIsLoading(false)
      updateBreadcrumbs('New Order')
    }
  }, [orderId])

  const updateBreadcrumbs = (title: string) => {
    setStepNav([
      { label: 'Orders', url: '/admin/collections/orders' },
      { label: title, url: '' }
    ])
  }

  const fetchOrder = async () => {
    try {
      // Depth 3 is required to resolve variant options fully
      const res = await fetch(`/api/orders/${orderId}?depth=3&t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setStatus(data.status || 'placed')
        updateBreadcrumbs(`#${data.id}`)
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      toast.error('Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!orderId) return
    setIsSaving(true)
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success('Order status updated successfully')
        fetchOrder() // Refresh data
      } else {
        const error = await res.json()
        toast.error(`Failed to update order: ${error.errors?.[0]?.message || 'Unknown error'}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Network error while saving')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader2 className={styles.spinner} size={48} color="#9ca3af" />
      </div>
    )
  }

  if (!order && isEditing) {
    return <div style={{ padding: '40px' }}>Order not found.</div>
  }

  if (!isEditing) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Create Order</h1>
        <p style={{ marginTop: '16px' }}>Orders are typically placed by customers on the storefront. Manual creation is not fully supported in this view.</p>
      </div>
    )
  }

  // Derived values
  const customer = typeof order.customer === 'object' ? order.customer : null
  const retailer = typeof order.retailer === 'object' ? order.retailer : null
  const deliveryPartner = typeof order.deliveryPartner === 'object' ? order.deliveryPartner : null
  
  const totalAmount = order.amount || 0

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Order #{order.id}</h1>
          <span className={`${styles.statusBadge} ${getStatusColorClass(order.status)}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>
            Placed on: {formatDate(order.createdAt)}
          </span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancelBtn} onClick={() => router.push('/admin/collections/orders')} type="button">
            Back to Orders
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving || status === order.status} type="button">
            {isSaving ? (
              <><Loader2 className={styles.spinner} size={16} /> Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        
        {/* ROW 1 */}
        {/* Order Summary */}
        <SectionCard 
          title="Order Summary" 
          description={`${order.items?.length || 0} items in this order`}
          className={styles.bentoSummary}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Current Price <Tooltip text="The price of the product right now, not necessarily the price when the order was placed." /></th>
                <th>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item: any, idx: number) => {
                const product = typeof item.product === 'object' ? item.product : null
                const variant = typeof item.variant === 'object' ? item.variant : null
                
                // Try to get image from gallery
                let imageUrl = ''
                if (product?.gallery?.[0]?.image?.url) {
                  imageUrl = product.gallery[0].image.url
                }

                // Determine unit price (from variant or fallback to 0)
                // Note: The schema does not currently store a frozen unit price per item
                const unitPrice = variant?.priceInINR || product?.priceInINR || 0
                const lineTotal = unitPrice * (item.quantity || 1)

                return (
                  <tr key={item.id || idx}>
                    <td>
                      <div className={styles.itemInfo}>
                        {imageUrl ? (
                          <img src={imageUrl} alt="Product" className={styles.itemImage} />
                        ) : (
                          <div className={styles.itemImage} />
                        )}
                        <div className={styles.itemDetails}>
                          {product?.id ? (
                            <Link 
                              href={`/admin/collections/products/${product.id}`}
                              className={styles.itemName}
                              style={{ color: '#2563eb', textDecoration: 'none' }}
                            >
                              {product?.title || variant?.title || 'Unknown Product'}
                            </Link>
                          ) : (
                            <span className={styles.itemName}>
                              {product?.title || variant?.title || 'Unknown Product'}
                            </span>
                          )}
                          {variant && variant.options && (
                            <span className={styles.itemVariant}>
                              Variant: {variant.options.map((o: any) => typeof o === 'object' ? (o.label || o.value) : o).join(' - ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{formatCurrency(unitPrice)}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(lineTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <div className={styles.summaryRow} style={{ marginTop: '16px' }}>
            <span>Total Amount Paid</span>
            <span className={styles.summaryTotal}>{formatCurrency(totalAmount, order.currency)}</span>
          </div>
        </SectionCard>

        {/* Customer & Shipping */}
        <SectionCard 
          title="Customer & Shipping" 
          description="Contact and delivery destination"
          className={styles.bentoCustomer}
        >
          <div className={styles.dataList}>
            <div className={styles.dataGroup}>
              <span className={styles.dataLabel}>Customer</span>
              <span className={styles.dataValue}>{customer?.name || 'Guest User'}</span>
              <span className={styles.dataSubValue}>{order.customerEmail || 'No email provided'}</span>
            </div>
            
            <div className={styles.dataGroup} style={{ marginTop: '12px' }}>
              <span className={styles.dataLabel}>Shipping Address</span>
              {order.shippingAddress ? (
                <div className={styles.dataSubValue} style={{ color: '#111827', marginTop: '4px' }}>
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.addressLine1}<br />
                  {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                  Phone: {order.shippingAddress.phone || 'N/A'}
                </div>
              ) : (
                <span className={styles.dataSubValue}>No shipping address recorded.</span>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ROW 2 */}
        {/* Fulfillment & Tracking */}
        <SectionCard 
          title="Fulfillment & Tracking" 
          description="Manage order status and partners"
          className={styles.bentoFulfillment}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            <div className={styles.dataList}>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Update Status <Tooltip text="Change the current status of the order. This will be logged in the timeline." /></span>
                <div style={{ marginTop: '4px' }}>
                  <SelectField 
                    label=""
                    options={ORDER_STATUS_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
                    value={status}
                    onChange={(val) => setStatus(val)}
                  />
                </div>
              </div>
              
              <div className={styles.dataGroup} style={{ marginTop: '8px' }}>
                <span className={styles.dataLabel}>Fulfilling Retailer</span>
                {retailer ? (
                  <>
                    <span className={styles.dataValue}>{retailer.shopName || retailer.ownerName || 'Unknown Shop'}</span>
                    <span className={styles.dataSubValue}>{retailer.emailId || retailer.mobileNumber}</span>
                  </>
                ) : (
                  <span className={styles.dataValue}>Unassigned</span>
                )}
              </div>
            </div>

            <div className={styles.dataList}>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Delivery Partner</span>
                {deliveryPartner ? (
                  <>
                    <span className={styles.dataValue}>{deliveryPartner.fullName}</span>
                    <span className={styles.dataSubValue}>{deliveryPartner.mobileNumber}</span>
                    <span className={styles.dataSubValue}>
                      Acceptance: <strong style={{ textTransform: 'capitalize' }}>{order.deliveryPartnerAcceptance}</strong>
                    </span>
                  </>
                ) : (
                  <span className={styles.dataSubValue}>No partner currently assigned.</span>
                )}
              </div>

              {/* Delivery Partner Queue Details */}
              {(!deliveryPartner && order.currentOfferedPartner) && (
                <div className={styles.dataGroup}>
                  <span className={styles.dataLabel}>Current Offer <Tooltip text="The order is currently pinging this rider to accept the delivery." /></span>
                  <span className={styles.dataSubValue}>
                    Offered to: {typeof order.currentOfferedPartner === 'object' ? order.currentOfferedPartner.fullName : 'ID: ' + order.currentOfferedPartner}
                  </span>
                  {order.offerExpiresAt && (
                    <span className={styles.dataSubValue}>
                      Expires: {formatDate(order.offerExpiresAt)}
                    </span>
                  )}
                </div>
              )}
              
              {order.rejectedDeliveryPartners && order.rejectedDeliveryPartners.length > 0 && (
                <div className={styles.dataGroup}>
                  <span className={styles.dataLabel}>Rejected By <Tooltip text="Number of riders who declined this delivery offer." /></span>
                  <span className={styles.dataSubValue}>{order.rejectedDeliveryPartners.length} partner(s)</span>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div className={styles.dataGroup}>
                  <span className={styles.dataLabel}>Pickup OTP <Tooltip text="Required for the rider to pick up from the retailer." /></span>
                  <span className={styles.dataValue} style={{ fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px' }}>
                    {order.pickupOTP || '---'}
                  </span>
                </div>
                <div className={styles.dataGroup}>
                  <span className={styles.dataLabel}>Delivery OTP <Tooltip text="Required for the rider to hand over to the customer." /></span>
                  <span className={styles.dataValue} style={{ fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px' }}>
                    {order.deliveryOTP || '---'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </SectionCard>

        {/* Payment Details */}
        <SectionCard 
          title="Payment Details" 
          description="Financial transactions"
          className={styles.bentoPayments}
        >
          <div className={styles.dataList}>
            {order.transactions && order.transactions.length > 0 ? (
              order.transactions.map((tx: any, idx: number) => {
                const transaction = typeof tx === 'object' ? tx : null
                if (!transaction) return null

                return (
                  <div key={transaction.id || idx} className={styles.dataGroup} style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className={styles.dataLabel}>Method</span>
                      <span className={styles.dataValue} style={{ textTransform: 'capitalize' }}>
                        {transaction.paymentMethod || 'Online'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span className={styles.dataSubValue}>Status:</span>
                      <span className={styles.dataValue} style={{ textTransform: 'capitalize' }}>
                        {transaction.status}
                      </span>
                    </div>

                    {transaction.amount != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span className={styles.dataSubValue}>Amount:</span>
                        <span className={styles.dataValue}>
                          {formatCurrency(transaction.amount, transaction.currency || 'INR')}
                        </span>
                      </div>
                    )}

                    {/* Razorpay specific details */}
                    {transaction.paymentMethod === 'razorpay' && transaction.razorpay && (
                      <>
                        {transaction.razorpay.paymentID && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span className={styles.dataSubValue}>Payment ID:</span>
                            <span className={styles.dataSubValue} style={{ fontSize: '11px' }}>{transaction.razorpay.paymentID}</span>
                          </div>
                        )}
                        {transaction.razorpay.refundStatus && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span className={styles.dataSubValue} style={{ color: '#991b1b' }}>Refund:</span>
                            <span className={styles.dataValue} style={{ textTransform: 'capitalize', color: '#991b1b' }}>{transaction.razorpay.refundStatus}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Stripe specific details */}
                    {transaction.paymentMethod === 'stripe' && transaction.stripe && (
                      <>
                        {transaction.stripe.paymentIntentID && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span className={styles.dataSubValue}>Intent ID:</span>
                            <span className={styles.dataSubValue} style={{ fontSize: '11px' }}>{transaction.stripe.paymentIntentID}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })
            ) : (
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel}>Payment Method</span>
                <span className={styles.dataValue}>
                  {order.codCollectionRecord ? 'Cash on Delivery (COD)' : 'No transactions recorded'}
                </span>
              </div>
            )}

            {order.codCollectionRecord && (
              <div className={styles.dataGroup} style={{ marginTop: '12px', padding: '12px', background: '#fef9c3', borderRadius: '6px', border: '1px solid #fef08a' }}>
                <span className={styles.dataLabel} style={{ color: '#854d0e' }}>COD Collection <Tooltip text="Cash to be collected upon delivery." /></span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span className={styles.dataSubValue} style={{ color: '#a16207' }}>Status:</span>
                  <span className={styles.dataValue} style={{ textTransform: 'capitalize', color: '#713f12' }}>{order.codCollectionRecord.status || 'Pending'}</span>
                </div>
                {order.codCollectionRecord.status === 'collected' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className={styles.dataSubValue} style={{ color: '#a16207' }}>Type:</span>
                    <span className={styles.dataValue} style={{ textTransform: 'capitalize', color: '#713f12' }}>{order.codCollectionRecord.paymentType}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Cancellation Details (if applicable) */}
        {order.status === 'cancelled' && order.cancellationDetails && (
          <SectionCard 
            title="Cancellation Details" 
            description="Information about order cancellation"
            className={styles.bentoTimeline} // Reusing full width
          >
            <div style={{ display: 'flex', gap: '32px', background: '#fee2e2', padding: '16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel} style={{ color: '#991b1b' }}>Cancelled At</span>
                <span className={styles.dataValue} style={{ color: '#7f1d1d' }}>
                  {formatDate(order.cancellationDetails.cancelledAt)}
                </span>
              </div>
              <div className={styles.dataGroup}>
                <span className={styles.dataLabel} style={{ color: '#991b1b' }}>Cancelled By</span>
                <span className={styles.dataValue} style={{ color: '#7f1d1d' }}>
                  {typeof order.cancellationDetails.cancelledBy === 'object' 
                    ? order.cancellationDetails.cancelledBy?.name || order.cancellationDetails.cancelledBy?.email 
                    : 'Unknown User'}
                </span>
              </div>
              <div className={styles.dataGroup} style={{ flex: 1 }}>
                <span className={styles.dataLabel} style={{ color: '#991b1b' }}>Reason</span>
                <span className={styles.dataValue} style={{ color: '#7f1d1d' }}>
                  {order.cancellationDetails.cancellationReason || 'No reason provided'}
                </span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ROW 3 */}
        {/* Timeline */}
        <SectionCard 
          title="Activity Timeline" 
          description="Log of status changes and events"
          className={styles.bentoTimeline}
        >
          {(order.statusHistory && order.statusHistory.length > 0) ? (
            <div className={styles.timeline}>
              {[...order.statusHistory].reverse().map((historyItem: any, idx: number) => {
                const changedBy = typeof historyItem.changedBy === 'object' ? historyItem.changedBy?.name || historyItem.changedBy?.email : 'Unknown'
                const dotClass = `${styles.timelineDot} ${getStatusColorClass(historyItem.status)}`
                
                return (
                  <div key={historyItem.id || idx} className={styles.timelineItem}>
                    <div className={dotClass} style={{ border: '2px solid white' }} />
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineStatus}>
                        Changed to: {historyItem.status.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.timelineMeta}>
                        {formatDate(historyItem.timestamp)} • By {changedBy} ({historyItem.changeSource})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>No history recorded yet.</p>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
