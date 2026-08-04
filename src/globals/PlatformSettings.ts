import type { GlobalConfig } from 'payload'
import { isAdmin } from '@/access/isAdmin'

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    group: 'Settings',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Fees & Delivery',
          fields: [
            {
              name: 'deliveryFeeMode',
              type: 'select',
              label: 'Delivery Fee Mode',
              defaultValue: 'flat',
              required: true,
              options: [
                { label: 'Flat Fee', value: 'flat' },
                { label: 'Variable (Per Order)', value: 'variable' },
              ],
            },
            {
              name: 'defaultDeliveryFee',
              type: 'number',
              label: 'Default Delivery Fee (₹)',
              defaultValue: 50,
              required: true,
              admin: {
                description: 'Used for flat fee mode, or as fallback for variable mode.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'platformFeeRetailer',
                  type: 'number',
                  label: 'Retailer Platform Fee (%)',
                  defaultValue: 10,
                  required: true,
                  min: 0,
                  max: 100,
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'platformFeeDP',
                  type: 'number',
                  label: 'Delivery Partner Platform Fee (%)',
                  defaultValue: 5,
                  required: true,
                  min: 0,
                  max: 100,
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Payout Configuration',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'payoutDelayDays',
                  type: 'number',
                  label: 'Payout Delay (Days)',
                  defaultValue: 7,
                  required: true,
                  min: 0,
                  admin: {
                    width: '50%',
                    description: 'Number of days to hold funds before eligible for payout.',
                  },
                },
                {
                  name: 'payoutDelayLabel',
                  type: 'select',
                  label: 'Payout Cycle Label',
                  defaultValue: 'weekly',
                  required: true,
                  options: [
                    { label: 'Immediate', value: 'immediate' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Bi-weekly', value: 'biweekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ],
                  admin: {
                    width: '50%',
                    description: 'Cosmetic label for UI',
                  },
                },
              ],
            },
            {
              name: 'minPayoutAmountINR',
              type: 'number',
              label: 'Minimum Payout Threshold (₹)',
              defaultValue: 100,
              required: true,
            },
            {
              name: 'payoutMode',
              type: 'select',
              label: 'Payout Mode',
              defaultValue: 'manual',
              required: true,
              options: [
                { label: 'Manual Disbursement', value: 'manual' },
                { label: 'Automatic (Razorpay X)', value: 'auto' },
              ],
            },
            {
              name: 'razorpayXGroup',
              type: 'group',
              label: 'Razorpay X Settings',
              admin: {
                condition: (_, siblingData) => siblingData?.payoutMode === 'auto',
              },
              fields: [
                {
                  name: 'razorpayXAccountNumber',
                  type: 'text',
                  label: 'Razorpay X Account Number',
                  required: true,
                },
                {
                  name: 'razorpayXKeyId',
                  type: 'text',
                  label: 'Razorpay X API Key ID',
                  required: true,
                },
                {
                  name: 'razorpayXKeySecret',
                  type: 'text',
                  label: 'Razorpay X API Key Secret',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
