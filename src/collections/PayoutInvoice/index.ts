import type { CollectionConfig } from 'payload'
import { isOwnPayoutRecord } from '@/access/isOwnPayoutRecord'
import { isAdmin } from '@/access/isAdmin'
import crypto from 'crypto'
import { markDisbursedEndpoint } from '@/endpoints/payouts/markDisbursed'

export const PayoutInvoice: CollectionConfig = {
  slug: 'payout-invoices',
  admin: {
    group: 'Finance',
    defaultColumns: ['invoiceNumber', 'invoiceType', 'recipient', 'totalNet', 'status', 'issuedAt', 'paidAt'],
  },
  access: {
    create: isAdmin,
    read: isOwnPayoutRecord,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [markDisbursedEndpoint],
  fields: [
    {
      name: 'invoiceNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
      hooks: {
        beforeValidate: [
          ({ value, operation, data }) => {
            if (operation === 'create' && !value) {
              const prefix = data?.invoiceType === 'retailer' ? 'INV-R' : 'INV-DP'
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
              const random = crypto.randomBytes(3).toString('hex').toUpperCase()
              return `${prefix}-${dateStr}-${random}`
            }
            return value
          },
        ],
      },
    },
    {
      name: 'invoiceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Retailer', value: 'retailer' },
        { label: 'Delivery Partner', value: 'delivery_partner' },
      ],
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
      name: 'retailerProfile',
      type: 'relationship',
      relationTo: 'retailers',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.invoiceType === 'retailer',
      },
    },
    {
      name: 'deliveryPartnerProfile',
      type: 'relationship',
      relationTo: 'delivery-partners',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.invoiceType === 'delivery_partner',
      },
    },
    {
      name: 'period',
      type: 'group',
      fields: [
        { name: 'from', type: 'date', required: true },
        { name: 'to', type: 'date', required: true },
      ],
    },
    {
      name: 'lineItems',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'orderRef', type: 'relationship', relationTo: 'orders', required: true },
        { name: 'orderNumber', type: 'text' },
        { name: 'grossAmount', type: 'number', required: true },
        { name: 'platformFeePercent', type: 'number', required: true },
        { name: 'platformFeeAmount', type: 'number', required: true },
        { name: 'netAmount', type: 'number', required: true },
        { name: 'deliveredAt', type: 'date', required: true },
      ],
    },
    {
      name: 'totalGross',
      type: 'number',
      required: true,
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.lineItems && Array.isArray(data.lineItems)) {
              return data.lineItems.reduce((acc: number, item: any) => acc + (item.grossAmount || 0), 0)
            }
            return 0
          },
        ],
      },
    },
    {
      name: 'totalFees',
      type: 'number',
      required: true,
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.lineItems && Array.isArray(data.lineItems)) {
              return data.lineItems.reduce((acc: number, item: any) => acc + (item.platformFeeAmount || 0), 0)
            }
            return 0
          },
        ],
      },
    },
    {
      name: 'totalNet',
      type: 'number',
      required: true,
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.lineItems && Array.isArray(data.lineItems)) {
              return data.lineItems.reduce((acc: number, item: any) => acc + (item.netAmount || 0), 0)
            }
            return 0
          },
        ],
      },
    },
    {
      name: 'payoutDestination',
      type: 'group',
      admin: {
        description: 'Snapshot of recipient payment method at time of payout.',
      },
      fields: [
        {
          name: 'methodType',
          type: 'select',
          options: [
            { label: 'Bank Account', value: 'bank_account' },
            { label: 'UPI', value: 'upi' },
          ],
        },
        { name: 'accountHolderName', type: 'text' },
        { name: 'accountNumber', type: 'text', admin: { description: 'Masked account number' } },
        { name: 'ifscCode', type: 'text' },
        { name: 'upiId', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Issued', value: 'issued' },
        { label: 'Paid', value: 'paid' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'issuedAt', type: 'date', admin: { position: 'sidebar' } },
    { name: 'paidAt', type: 'date', admin: { position: 'sidebar' } },
    { name: 'payoutRef', type: 'text', admin: { position: 'sidebar', description: 'Razorpay payout ID or manual reference' } },
    { name: 'adminNotes', type: 'textarea' },
  ],
}
