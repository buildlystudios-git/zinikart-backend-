import type { Field } from 'payload'
import { normalizeMobileNumberFieldHook } from '@/hooks/normalizeMobileNumberFieldHook'

export const mobileAuthFields: Field[] = [
  {
    name: 'mobileNumber',
    type: 'text',
    admin: {
      description: 'Primary mobile number for OTP login. Store in E.164 format.',
      position: 'sidebar',
    },
    index: true,
    unique: true,
    hooks: {
      beforeValidate: [normalizeMobileNumberFieldHook],
    },
  },
  {
    name: 'mobileVerified',
    type: 'checkbox',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    defaultValue: false,
  },
  {
    name: 'lastOtpLoginAt',
    type: 'date',
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
      position: 'sidebar',
      readOnly: true,
    },
  },
]
