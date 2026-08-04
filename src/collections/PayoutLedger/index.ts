import type { CollectionConfig } from 'payload'
import { isOwnPayoutRecord } from '@/access/isOwnPayoutRecord'
import { isAdmin } from '@/access/isAdmin'

export const PayoutLedger: CollectionConfig = {
  slug: 'payout-ledger',
  admin: {
    group: 'Finance',
    defaultColumns: ['recipientType', 'order', 'netAmount', 'status', 'eligibleAt', 'paidAt'],
  },
  access: {
    create: isAdmin,
    read: isOwnPayoutRecord,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'recipientType',
      type: 'select',
      required: true,
      options: [
        { label: 'Retailer', value: 'retailer' },
        { label: 'Delivery Partner', value: 'delivery_partner' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'retailerProfile',
      type: 'relationship',
      relationTo: 'retailers',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.recipientType === 'retailer',
      },
    },
    {
      name: 'deliveryPartnerProfile',
      type: 'relationship',
      relationTo: 'delivery-partners',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.recipientType === 'delivery_partner',
      },
    },
    {
      name: 'grossAmount',
      type: 'number',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'platformFeePercent',
      type: 'number',
      required: true,
      admin: { readOnly: true, description: 'Snapshot at creation time' },
    },
    {
      name: 'platformFeeAmount',
      type: 'number',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'netAmount',
      type: 'number',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'deliveredAt',
      type: 'date',
      required: true,
    },
    {
      name: 'eligibleAt',
      type: 'date',
      required: true,
    },
    {
      name: 'paidAt',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Eligible', value: 'eligible' },
        { label: 'Processing', value: 'processing' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'On Hold', value: 'on_hold' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'payoutRef',
      type: 'text',
      admin: {
        description: 'Razorpay payout ID or manual admin reference',
      },
    },
    {
      name: 'payoutInvoice',
      type: 'relationship',
      relationTo: 'payout-invoices',
      admin: { position: 'sidebar' },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
    },
    {
      name: 'failureReason',
      type: 'text',
      admin: { readOnly: true },
    },
  ],
}
