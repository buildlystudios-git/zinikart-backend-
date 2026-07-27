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

export const setTemplateFields: CollectionBeforeChangeHook = async ({ req, operation, data }) => {
  if (operation === 'create' && req.user) {
    const isAdmin = req.user.roles?.includes('admin')
    const isRetailer = req.user.roles?.includes('retailer')

    if (isAdmin) {
      // Admins: Default to a master template unless explicitly set otherwise
      if (data.isMasterTemplate === undefined) {
        data.isMasterTemplate = true
      }
      // Admins don't list under a parent template
      data.parentTemplate = null
    } else if (isRetailer) {
      // Retailers: Forced to false (retailers cannot create master templates)
      data.isMasterTemplate = false

      // If the retailer is cloning from a master template, inherit missing catalog fields
      if (data.parentTemplate) {
        const templateId = typeof data.parentTemplate === 'object'
          ? data.parentTemplate?.id
          : data.parentTemplate

        if (templateId) {
          try {
            const template = await req.payload.findByID({
              collection: 'products',
              id: templateId,
              depth: 1,
              req,
            })

            if (template && template.isMasterTemplate === true) {
              // Inherit each catalog field from the template only if the retailer hasn't already provided it
              for (const field of INHERITABLE_TEMPLATE_FIELDS) {
                const templateValue = (template as any)[field]
                const userValue = data[field]

                // Inherit if:
                // - User did not pass the field at all (undefined)
                // - User passed an empty array/null (falsy) for array-type fields
                const isEmpty =
                  userValue === undefined ||
                  userValue === null ||
                  (Array.isArray(userValue) && userValue.length === 0)

                if (isEmpty && templateValue !== undefined && templateValue !== null) {
                  // For relationship arrays with populated objects, extract IDs only
                  if (Array.isArray(templateValue)) {
                    data[field] = templateValue.map((item: any) =>
                      typeof item === 'object' && item?.id ? item.id : item
                    )
                  } else if (typeof templateValue === 'object' && templateValue?.id) {
                    // Single populated relationship — extract the ID
                    data[field] = templateValue.id
                  } else {
                    data[field] = templateValue
                  }
                }
              }
            } else {
              req.payload.logger.warn(
                `setTemplateFields: parentTemplate ${templateId} is not a master template — skipping field inheritance.`
              )
            }
          } catch (err) {
            req.payload.logger.error(`setTemplateFields: failed to fetch template ${templateId}: ${err}`)
          }
        }
      } else {
        // Creating a custom product from scratch without a template
        data.parentTemplate = null
      }
    }
  }

  return data
}
