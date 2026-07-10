import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Ensures exactly one payment method is marked as default.
 * - If the user marks one as default, all others are cleared.
 * - If no entry is marked as default, the first entry is auto-defaulted.
 * - If multiple entries are marked (e.g. user just checked one), the most recently
 *   checked one (highest index change) wins — we use a "last true wins" approach
 *   by keeping the last isDefault=true and clearing the rest.
 */
export const enforceDefaultPaymentMethod: CollectionBeforeChangeHook = ({ data }) => {
  const methods: any[] | undefined = data?.paymentMethods

  if (!Array.isArray(methods) || methods.length === 0) {
    return data
  }

  // Find the last entry marked as default (last-write-wins for concurrent UI checkboxes)
  let lastDefaultIndex = -1
  for (let i = methods.length - 1; i >= 0; i--) {
    if (methods[i].isDefault === true) {
      lastDefaultIndex = i
      break
    }
  }

  // If none marked as default, auto-default the first one
  if (lastDefaultIndex === -1) {
    lastDefaultIndex = 0
  }

  // Clear all others and set exactly one default
  data.paymentMethods = methods.map((method, i) => ({
    ...method,
    isDefault: i === lastDefaultIndex,
  }))

  return data
}
