import type { Validate } from 'payload'

export const validateSpecifications: Validate = async (value, { data, req }) => {
  const categoryIds = (data as any)?.categories
  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return true
  }

  const categoryId = typeof categoryIds[0] === 'object' ? (categoryIds[0] as any).id : categoryIds[0]
  try {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: categoryId,
      req,
    })

    const templates = category?.specificationTemplates || []
    const specs = (value as any[]) || []

    for (const template of templates) {
      const matchingSpec = specs.find(
        (s: any) => s && s.key && s.key.trim().toLowerCase() === template.name.trim().toLowerCase()
      )

      if (template.required) {
        if (!matchingSpec || !matchingSpec.value || !matchingSpec.value.trim()) {
          return `The specification field "${template.name}" is required for category "${category.title}".`
        }
      }

      if (matchingSpec && matchingSpec.value && matchingSpec.value.trim()) {
        const val = matchingSpec.value.trim()

        if (template.type === 'number') {
          if (isNaN(Number(val))) {
            return `The specification "${template.name}" must be a valid number, got "${val}".`
          }
        }

        if (template.type === 'date') {
          if (isNaN(Date.parse(val))) {
            return `The specification "${template.name}" must be a valid date, got "${val}".`
          }
        }

        if (template.type === 'select' && template.options && template.options.length > 0) {
          const allowedValues = template.options.map((o: any) => o.option.trim().toLowerCase())
          if (!allowedValues.includes(val.toLowerCase())) {
            const optionsList = template.options.map((o: any) => o.option).join(', ')
            return `The specification "${template.name}" has value "${val}" which is not allowed. Choose from: ${optionsList}.`
          }
        }
      }
    }
  } catch (err) {
    return `Failed to validate specifications against category template: ${err instanceof Error ? err.message : String(err)}`
  }

  return true
}
