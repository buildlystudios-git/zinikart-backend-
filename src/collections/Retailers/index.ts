import type { CollectionConfig } from 'payload'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOrFieldOwner } from '@/access/adminOrFieldOwner'
import { analyticsEndpoint } from '@/endpoints/retailers/analytics'
import { enforceDefaultPaymentMethod } from '@/hooks/enforceDefaultPaymentMethod'
import { assignUserId } from './hooks/assignUserId'

export const Retailers: CollectionConfig = {
  slug: 'retailers',
  endpoints: [
    {
      path: '/analytics',
      method: 'get',
      handler: analyticsEndpoint,
    },
  ],
  access: {
    create: isAuthenticated,
    read: adminOrFieldOwner('user'),
    update: adminOrFieldOwner('user'),
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'shopName',
    defaultColumns: ['shopName', 'ownerName', 'approvalStatus', 'createdAt'],
    group: 'Profiles',
  },
  hooks: {
    beforeChange: [
      assignUserId,
      enforceDefaultPaymentMethod,
    ],
  },
  fields: [
    {
      name: 'shopName',
      type: 'text',
      required: true,
    },
    {
      name: 'ownerName',
      type: 'text',
      required: true,
    },
    {
      name: 'mobileNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'emailId',
      type: 'email',
      required: true,
    },
    {
      name: 'alternateContactNumber',
      type: 'text',
      required: false,
    },
    {
      name: 'gstNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'images',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      required: true,
    },
    {
      name: 'shopAddress',
      type: 'group',
      required: true,
      fields: [
        {
          name: 'street',
          type: 'text',
          required: true,
        },
        {
          name: 'landmark',
          type: 'text',
          required: false,
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'state',
          type: 'text',
          required: true,
        },
        {
          name: 'zipCode',
          type: 'text',
          required: true,
        },
        {
          name: 'lat',
          type: 'number',
        },
        {
          name: 'lng',
          type: 'number',
        },
      ],
    },
    {
      name: 'paymentMethods',
      type: 'array',
      label: 'Payment Methods',
      admin: {
        description: 'Add one or more payment methods. Mark one as the default payout destination.',
      },
      fields: [
        {
          name: 'methodType',
          type: 'select',
          label: 'Method Type',
          required: true,
          options: [
            { label: 'Bank Account', value: 'bank_account' },
            { label: 'UPI', value: 'upi' },
          ],
        },
        {
          name: 'isDefault',
          type: 'checkbox',
          label: 'Set as Default',
          defaultValue: false,
          admin: {
            description: 'Only one payment method can be the default at a time.',
          },
        },
        // Bank account fields – shown when methodType is bank_account
        {
          name: 'accountHolderName',
          type: 'text',
          label: 'Account Holder Name',
          admin: {
            condition: (data, siblingData) => siblingData?.methodType === 'bank_account',
          },
        },
        {
          name: 'accountNumber',
          type: 'text',
          label: 'Account Number',
          admin: {
            condition: (data, siblingData) => siblingData?.methodType === 'bank_account',
          },
        },
        {
          name: 'ifscCode',
          type: 'text',
          label: 'IFSC Code',
          admin: {
            condition: (data, siblingData) => siblingData?.methodType === 'bank_account',
          },
        },
        {
          name: 'bankName',
          type: 'text',
          label: 'Bank Name',
          admin: {
            condition: (data, siblingData) => siblingData?.methodType === 'bank_account',
          },
        },
        // UPI field – shown when methodType is upi
        {
          name: 'upiId',
          type: 'text',
          label: 'UPI ID',
          admin: {
            condition: (data, siblingData) => siblingData?.methodType === 'upi',
          },
        },
      ],
    },
    {
      name: 'businessHours',
      type: 'group',
      required: true,
      fields: [
        {
          name: 'startTime',
          type: 'text',
          required: true,
        },
        {
          name: 'endTime',
          type: 'text',
          required: true,
        },
        {
          name: 'weekOff',
          type: 'select',
          hasMany: true,
          options: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
        },
        {
          name: 'openEveryday',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'approvalStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
        {
          label: 'Suspended',
          value: 'suspended',
        },
      ],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      access: {
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'averageRating',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Pre-calculated average rating cached from the reviews',
      },
    },
    {
      name: 'ratingCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Total number of ratings submitted for this retailer',
      },
    },
  ],
}
