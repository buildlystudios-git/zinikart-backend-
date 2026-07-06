import type { CollectionConfig } from 'payload'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { isAdmin } from '@/access/isAdmin'
import { isAuthenticated } from '@/access/isAuthenticated'
import { adminOrFieldOwner } from '@/access/adminOrFieldOwner'
import { associateUser } from './hooks/associateUser'

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
    beforeChange: [associateUser],
  },
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
      name: 'bankDetails',
      type: 'group',
      required: true,
      fields: [
        {
          name: 'accountHolderName',
          type: 'text',
          required: true,
        },
        {
          name: 'accountNumber',
          type: 'text',
          required: true,
        },
        {
          name: 'ifscCode',
          type: 'text',
          required: true,
        },
        {
          name: 'bankName',
          type: 'text',
          required: true,
        },
        {
          name: 'upiId',
          type: 'text',
          required: false,
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
