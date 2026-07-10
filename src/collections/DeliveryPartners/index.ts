import type { CollectionConfig } from 'payload'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOrFieldOwner } from '@/access/adminOrFieldOwner'
import { associateUser } from './hooks/associateUser'
import { locationTrackingEndpoint } from '@/endpoints/delivery-partners/location'
import { enforceDefaultPaymentMethod } from '@/hooks/enforceDefaultPaymentMethod'

export const DeliveryPartners: CollectionConfig = {
  slug: 'delivery-partners',
  access: {
    create: isAuthenticated,
    read: adminOrFieldOwner('user'),
    update: adminOrFieldOwner('user'),
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'mobileNumber', 'vehicleType', 'approvalStatus', 'onlineStatus', 'createdAt'],
    group: 'Profiles',
  },
  hooks: {
    beforeChange: [associateUser, enforceDefaultPaymentMethod],
  },
  endpoints: [locationTrackingEndpoint],
  fields: [
    {
      name: 'fullName',
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
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'gender',
      type: 'select',
      required: true,
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'dob',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'drivingLicense',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'drivingLicenseNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'pancardNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'pancardImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'vehicleBrand',
      type: 'text',
      required: true,
    },
    {
      name: 'vehicleRegistrationNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'selfieImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
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
      name: 'vehicleType',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Bike',
          value: 'bike',
        },
        {
          label: 'Scooter',
          value: 'scooter',
        },
        {
          label: 'Bicycle',
          value: 'bicycle',
        },
        {
          label: 'Car',
          value: 'car',
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
      name: 'onlineStatus',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    {
      name: 'lat',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lng',
      type: 'number',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastLocationUpdatedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
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
  ],
}
