import type { CollectionBeforeChangeHook } from 'payload'

// Fields that are inherited from the master template if not provided by the retailer.
// These are "catalog defaults" — things unlikely to change per-retailer listing.
const INHERITABLE_TEMPLATE_FIELDS = [
  'description',
  'gallery',
  'layout',
  'specifications',
  'relatedProducts',
  'variants',
  'variantTypes',
  'enableVariants',
  'brand',
  'categories',
  'warranty',
  'meta',
  'priceInINR',
  'priceInINREnabled',
] as const

/**
 * Detects whether a value is a populated Payload CMS document
 * (relationship or upload field resolved to a full object).
 * Payload documents always have `id` + at least one of `createdAt`/`updatedAt`.
 */
function isPopulatedDoc(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    (value.createdAt !== undefined || value.updatedAt !== undefined)
  )
}

/**
 * Recursively sanitizes a value fetched from Payload with depth > 0 so it can
 * be saved back into a new document. It:
 *  - Extracts the ID string from populated relationship/upload documents
 *  - Strips `id` from plain nested objects (array items, groups) — Payload
 *    auto-generates new IDs for array rows on create
 *  - Recurses into arrays and plain objects
 *  - Passes through primitive values unchanged
 */
function sanitizeForPayload(value: any): any {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map(sanitizeForPayload)
  }

  // Populated Payload document (relationship/upload) — return just the ID string
  if (isPopulatedDoc(value)) {
    return value.id
  }

  // Plain nested object (array item row, group field, block, etc.)
  // Recurse into each property, but omit 'id' since Payload will auto-generate new row IDs
  const result: Record<string, any> = {}
  for (const key of Object.keys(value)) {
    if (key === 'id') continue
    result[key] = sanitizeForPayload(value[key])
  }
  return result
}

export const setTemplateFields: CollectionBeforeChangeHook = async ({ req, operation, data }) => {
  if (operation === 'create' && req.user) {
    const isAdmin = req.user.roles?.includes('admin')
    const isRetailer = req.user.roles?.includes('retailer')

    req.payload.logger.info(
      `[setTemplateFields] operation=${operation} userId=${req.user.id} isAdmin=${isAdmin} isRetailer=${isRetailer} parentTemplate=${data.parentTemplate ?? 'none'}`,
    )

    if (isAdmin) {
      if (data.isMasterTemplate === undefined) {
        data.isMasterTemplate = true
      }
      data.parentTemplate = null
    } else if (isRetailer) {
      data.isMasterTemplate = false

      if (data.parentTemplate) {
        const templateId =
          typeof data.parentTemplate === 'object' ? data.parentTemplate?.id : data.parentTemplate

        req.payload.logger.info(`[setTemplateFields] Fetching master template id=${templateId}`)

        if (templateId) {
          try {
            const template = await req.payload.findByID({
              collection: 'products',
              id: templateId,
              depth: 1,
              req,
            })

            if (!template) {
              req.payload.logger.error(
                `[setTemplateFields] Template id=${templateId} not found — aborting inheritance`,
              )
            } else if (template.isMasterTemplate !== true) {
              req.payload.logger.warn(
                `[setTemplateFields] id=${templateId} exists but isMasterTemplate=false — skipping inheritance`,
              )
            } else {
              req.payload.logger.info(
                `[setTemplateFields] Template "${(template as any).title}" (id=${templateId}) found. Beginning field inheritance...`,
              )

              for (const field of INHERITABLE_TEMPLATE_FIELDS) {
                const templateValue = (template as any)[field]
                const userValue = data[field]

                const isEmpty =
                  userValue === undefined ||
                  userValue === null ||
                  (Array.isArray(userValue) && userValue.length === 0)

                if (isEmpty && templateValue !== undefined && templateValue !== null) {
                  const sanitized = sanitizeForPayload(templateValue)
                  data[field] = sanitized
                  req.payload.logger.info(
                    `[setTemplateFields] Inherited field="${field}" value=${JSON.stringify(sanitized).slice(0, 120)}`,
                  )
                } else if (!isEmpty) {
                  req.payload.logger.info(
                    `[setTemplateFields] Skipped field="${field}" (user provided their own value)`,
                  )
                } else {
                  req.payload.logger.info(
                    `[setTemplateFields] Skipped field="${field}" (template has no value for this field)`,
                  )
                }
              }

              req.payload.logger.info(
                `[setTemplateFields] Inheritance complete for template id=${templateId}`,
              )
            }
          } catch (err: any) {
            req.payload.logger.error(
              `[setTemplateFields] Error fetching template id=${templateId}: ${err?.message ?? err}`,
            )
            req.payload.logger.error(`[setTemplateFields] Stack: ${err?.stack ?? 'N/A'}`)
          }
        }
      } else {
        req.payload.logger.info(
          `[setTemplateFields] No parentTemplate — creating product from scratch`,
        )
        data.parentTemplate = null
      }
    }
  }

  return data
}
