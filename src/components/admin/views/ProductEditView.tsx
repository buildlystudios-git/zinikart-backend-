'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'
import { SectionCard } from '../ui/SectionCard'
import { TextInput } from '../ui/TextInput'
import { SelectField } from '../ui/SelectField'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { MultiMediaSelector } from '../ui/MultiMediaSelector'
import { VariantsConfigurator } from '../ui/VariantsConfigurator'
import { CheckboxList } from '../ui/CheckboxList'
import { Tooltip } from '../ui/Tooltip'
import styles from './ProductEditView.module.css'

export default function ProductEditView() {
  const pathname = usePathname()
  const router = useRouter()
  const { setStepNav } = useStepNav()
  
  // Extract ID from pathname (e.g., /admin/collections/products/123)
  const segments = pathname.split('/')
  const productId = segments[segments.length - 1]
  const isEditing = productId !== 'create'

  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [initialVariants, setInitialVariants] = useState<any[]>([])
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    brand: '',
    categories: [],
    retailer: '',
    priceInINR: 0,
    discountPercent: 0,
    inventory: 0,
    gallery: [], // array of media objects
    specifications: [],
    warranty: '',
    isMasterTemplate: false,
    parentTemplate: '',
    relatedProducts: [],
    meta: {
      title: '',
      description: '',
      image: null
    },
    // Ecommerce specific
    enableVariants: false,
    variants: [],
    variantOptions: [],
    variantTypes: [],
    // Read-only stats
    slug: '',
    averageRating: 0,
    ratingCount: 0,
    discountedPrice: 0
  })

  // Reference data
  const [allBrands, setAllBrands] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [allRetailers, setAllRetailers] = useState<any[]>([])
  const [allVariantTypes, setAllVariantTypes] = useState<any[]>([])
  const [allVariantOptions, setAllVariantOptions] = useState<any[]>([])

  useEffect(() => {
    fetchReferenceData()
    if (isEditing) {
      fetchProduct()
    } else {
      updateBreadcrumbs('Create New Product')
    }
  }, [pathname]) // Re-run if path changes

  const updateBreadcrumbs = (title: string) => {
    setStepNav([
      { label: 'Products', url: '/admin/collections/products' },
      { label: title, url: '' }
    ])
  }

  // Auto-populate specifications from selected categories
  useEffect(() => {
    if (!allCategories.length || !formData.categories.length) return
    
    const relevantCats = allCategories.filter(c => formData.categories.includes(c.id))
    const allTemplates = relevantCats.flatMap(c => c.specificationTemplates || [])
    
    if (allTemplates.length === 0) return
    
    const existingKeys = formData.specifications.map((s: any) => s.key)
    const newSpecs: any[] = []
    
    allTemplates.forEach(template => {
      if (!existingKeys.includes(template.name)) {
        newSpecs.push({
          key: template.name,
          value: '',
          type: template.type || 'text'
        })
      }
    })
    
    if (newSpecs.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        specifications: [...prev.specifications, ...newSpecs]
      }))
    }
  }, [formData.categories, allCategories])

  const fetchReferenceData = async () => {
    try {
      const [brandsRes, catRes, prodRes, usersRes, vTypesRes, vOptsRes] = await Promise.all([
        fetch('/api/brands?limit=100'),
        fetch('/api/categories?limit=100'),
        fetch('/api/products?limit=100'),
        fetch('/api/users?limit=100'),
        fetch('/api/variantTypes?limit=100'),
        fetch('/api/variantOptions?limit=1000')
      ])
      
      if (brandsRes.ok) setAllBrands((await brandsRes.json()).docs)
      if (catRes.ok) setAllCategories((await catRes.json()).docs)
      if (prodRes.ok) setAllProducts((await prodRes.json()).docs)
      if (usersRes.ok) setAllRetailers((await usersRes.json()).docs)
      if (vTypesRes.ok) setAllVariantTypes((await vTypesRes.json()).docs)
      if (vOptsRes.ok) setAllVariantOptions((await vOptsRes.json()).docs)
    } catch (err) {
      console.error('Failed to fetch references', err)
    }
  }

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}?t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        
        const galleryItems = data.gallery ? data.gallery.map((g: any) => ({
          image: typeof g.image === 'object' ? g.image : { id: g.image },
          variantOption: typeof g.variantOption === 'object' ? g.variantOption?.id : g.variantOption,
          id: g.id
        })).filter((g: any) => g.image) : []
        
        // Extract category IDs
        const catArray = data.categories ? (Array.isArray(data.categories) ? data.categories : data.categories.docs || []) : []
        const fetchedCats = catArray.map((c: any) => typeof c === 'object' ? c.id : c)
        
        // Extract related products
        const relArray = data.relatedProducts ? (Array.isArray(data.relatedProducts) ? data.relatedProducts : data.relatedProducts.docs || []) : []
        const fetchedRel = relArray.map((r: any) => typeof r === 'object' ? r.id : r)
        
        // Extract plain description text (Lexical state to plain text is complex, we handle what we can)
        // For now, if description is Lexical object, it's hard to edit in textarea. 
        // We will just store the object and stringify/parse, or warn.
        let descText = ''
        if (typeof data.description === 'string') {
          descText = data.description
        } else if (data.description?.root) {
          try {
            descText = data.description.root.children.map((c:any) => c.children?.map((textNode:any) => textNode.text).join('')).join('\n')
          } catch(e) {}
        }
        
        const variantsArray = data.variants ? (Array.isArray(data.variants) ? data.variants : data.variants.docs || []) : []
        const variantTypesArray = data.variantTypes ? (Array.isArray(data.variantTypes) ? data.variantTypes : data.variantTypes.docs || []) : []
        const variantOptionsArray = data.variantOptions ? (Array.isArray(data.variantOptions) ? data.variantOptions : data.variantOptions.docs || []) : []
        
        const fetchedVariantTypes = variantTypesArray.map((v: any) => typeof v === 'object' ? v.id : v)
        const fetchedVariantOptions = variantOptionsArray.map((v: any) => typeof v === 'object' ? v.id : v)

        setFormData({
          title: data.title || '',
          description: descText,
          brand: typeof data.brand === 'object' ? data.brand?.id : data.brand,
          categories: fetchedCats,
          retailer: typeof data.retailer === 'object' ? data.retailer?.id : data.retailer,
          priceInINR: data.priceInINR || 0,
          discountPercent: data.discountPercent || 0,
          inventory: data.inventory || 0,
          gallery: galleryItems,
          specifications: data.specifications || [],
          warranty: data.warranty || '',
          isMasterTemplate: data.isMasterTemplate || false,
          parentTemplate: typeof data.parentTemplate === 'object' ? data.parentTemplate?.id : data.parentTemplate,
          relatedProducts: fetchedRel,
          meta: data.meta || { title: '', description: '', image: null },
          enableVariants: data.enableVariants || false,
          variants: variantsArray,
          variantOptions: fetchedVariantOptions,
          variantTypes: fetchedVariantTypes,
          slug: data.slug || '',
          averageRating: data.averageRating || 0,
          ratingCount: data.ratingCount || 0,
          discountedPrice: data.discountedPrice || 0
        })
        
        setInitialVariants(variantsArray)
        updateBreadcrumbs(data.title || 'Edit Product')
      }
    } catch (err) {
      console.error('Error fetching product:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveVariants = async (targetProductId: string) => {
    const currentVariants = formData.variants || []
    const existingIds = currentVariants.filter((v:any) => v.id).map((v:any) => v.id)
    const toDelete = initialVariants.filter(v => !existingIds.includes(v.id))
    
    const promises = []
    
    for (const v of toDelete) {
      promises.push(fetch(`/api/variants/${v.id}`, { method: 'DELETE' }))
    }
    
    for (const v of currentVariants) {
      const payload = {
        options: (v.options || []).map((o:any) => typeof o === 'object' ? o.id : o),
        priceInINR: v.priceInINR,
        inventory: v.inventory,
        product: targetProductId
      }
      
      if (v.id) {
        promises.push(fetch(`/api/variants/${v.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }))
      } else {
        promises.push(fetch(`/api/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }))
      }
    }
    
    await Promise.all(promises)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const mappedGallery = formData.gallery.map((m: any) => ({
        image: m.image?.id || m.image,
        variantOption: m.variantOption || null
      }))
      
      // We will only update description if it's not a complex Lexical object that we can't safely overwrite as string.
      // Since Payload accepts string for text fields but richText requires JSON, we might hit validation errors if we send a raw string to a Lexical field unless we format it.
      // For the sake of this custom UI, we'll send a basic Lexical paragraph if they edited it.
      const lexicalDesc = {
        root: {
          type: "root",
          format: "",
          indent: 0,
          version: 1,
          children: [
            {
              type: "paragraph",
              format: "",
              indent: 0,
              version: 1,
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: formData.description,
                  type: "text",
                  version: 1
                }
              ]
            }
          ]
        }
      }

      // Remove variants from the product payload since it's a join field
      const { variants, ...productPayload } = formData

      const payload = {
        ...productPayload,
        description: lexicalDesc,
        gallery: mappedGallery
      }

      const url = isEditing ? `/api/products/${productId}` : '/api/products'
      const method = isEditing ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const productRes = await res.json()
        const savedProductId = isEditing ? productId : productRes.doc.id
        
        await saveVariants(savedProductId)
        
        if (!isEditing) {
          router.push(`/admin/collections/products/${savedProductId}`)
        } else {
          // Re-fetch to get new variant IDs
          fetchProduct()
          toast.success('Product and Variants saved successfully!')
        }
      } else {
        const error = await res.json()
        toast.error(`Validation error: ${error.errors?.[0]?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Save failed', error)
      toast.error('Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const addSpec = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { key: '', value: '', type: 'text' }]
    })
  }

  const removeSpec = (index: number) => {
    const newSpecs = [...formData.specifications]
    newSpecs.splice(index, 1)
    setFormData({ ...formData, specifications: newSpecs })
  }

  const updateSpec = (index: number, field: string, value: string) => {
    const newSpecs = [...formData.specifications]
    newSpecs[index][field] = value
    setFormData({ ...formData, specifications: newSpecs })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={48} className={styles.spinner} />
        <p>Loading product data...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{isEditing ? 'Edit Product' : 'Create Product'}</h1>
          <p className={styles.subtitle}>Manage product details, pricing, and variants.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancelBtn} onClick={() => router.push('/admin/collections/products')} type="button">
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving} type="button">
            {isSaving && <Loader2 className={styles.spinner} size={16} />}
            {isEditing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {/* Row 1 & 2: Main Info */}
        <SectionCard 
          title="General Information" 
          description="Basic details about this product."
          className={styles.bentoGeneral}
        >
          <TextInput 
            label="Product Title"
            name="title"
            value={formData.title}
            onChange={(val) => setFormData({ ...formData, title: val })}
            required
          />
          {formData.slug && (
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#6b7280' }}>
              Slug: <span style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{formData.slug}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Description
            </span>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{
                width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px',
                fontFamily: 'inherit', fontSize: '14px', color: '#111827', resize: 'vertical', background: '#ffffff'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <CheckboxList 
              label="Categories"
              options={allCategories.map(c => ({ label: c.title, value: c.id }))}
              selectedValues={formData.categories}
              onChange={(vals) => setFormData({ ...formData, categories: vals })}
            />
          </div>

          <div className={styles.twoColumns}>
            <SelectField 
              label="Brand"
              options={allBrands.map(b => ({ label: b.name, value: b.id }))}
              value={formData.brand}
              onChange={(val) => setFormData({ ...formData, brand: val })}
            />
            <SelectField 
              label="Retailer"
              options={allRetailers.map(r => ({ label: r.email || r.id, value: r.id }))}
              value={formData.retailer}
              onChange={(val) => setFormData({ ...formData, retailer: val })}
            />
          </div>

          {isEditing && (
            <div style={{ display: 'flex', gap: '24px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ flex: 1, background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Average Rating</span>
                <span style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{formData.averageRating ? formData.averageRating.toFixed(1) : '0.0'}</span>
                <span style={{ fontSize: '18px', color: '#fbbf24', marginLeft: '8px' }}>★</span>
              </div>
              <div style={{ flex: 1, background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Reviews</span>
                <span style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>{formData.ratingCount || 0}</span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Right Sidebar spanning 2 rows */}
        <SectionCard 
          title="Media Gallery" 
          description={<>Product images <Tooltip text="Images that will be displayed in the product slider/gallery on the storefront." /></>}
          className={styles.bentoMedia}
        >
          <MultiMediaSelector 
            label="Gallery Images"
            values={formData.gallery}
            onChange={(docs) => setFormData({ ...formData, gallery: docs })}
            validVariantOptions={allVariantOptions.filter(opt => {
              const typeId = typeof opt.variantType === 'object' ? opt.variantType?.id : opt.variantType
              return (formData.variantTypes || []).includes(typeId)
            })}
          />
        </SectionCard>

        <SectionCard 
          title="Pricing & Inventory" 
          description="Set the base price and stock levels."
          className={styles.bentoPricing}
        >
          <div className={styles.twoColumns}>
            <TextInput 
              label="Base Price (INR)"
              name="priceInINR"
              type="number"
              value={formData.priceInINR?.toString()}
              onChange={(val) => setFormData({ ...formData, priceInINR: parseFloat(val) || 0 })}
            />
            <TextInput 
              label="Discount Percent (%)"
              name="discountPercent"
              type="number"
              value={formData.discountPercent?.toString()}
              onChange={(val) => setFormData({ ...formData, discountPercent: parseFloat(val) || 0 })}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Final Price</span>
              <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: '6px', fontWeight: 600 }}>
                ₹ {formData.priceInINR - (formData.priceInINR * (formData.discountPercent / 100))}
                {isEditing && formData.discountedPrice > 0 && (
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 400 }}>(Saved: ₹{formData.discountedPrice})</span>
                )}
              </div>
            </div>
            <TextInput 
              label={<>Base Inventory <Tooltip text="Stock count for the base product." /></>}
              name="inventory"
              type="number"
              value={formData.inventory?.toString()}
              onChange={(val) => setFormData({ ...formData, inventory: parseInt(val) || 0 })}
            />
          </div>
        </SectionCard>

        {/* Row 4: Specs and Relations */}
        <SectionCard 
          title="Specifications & Warranty" 
          description={<>Technical details and warranty info <Tooltip text="These are displayed in the technical details tab on the product page." /></>}
          className={styles.bentoSpecs}
        >
          <TextInput 
            label="Warranty Details"
            name="warranty"
            value={formData.warranty}
            onChange={(val) => setFormData({ ...formData, warranty: val })}
          />
          
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '8px' }}>Specifications</span>
            <div className={styles.specsTable}>
              <div className={styles.specsHeader}>
                <div>Field Name</div>
                <div>Value</div>
                <div>Type</div>
                <div></div>
              </div>
              {formData.specifications.map((spec: any, idx: number) => (
                <div key={idx} className={styles.specRow}>
                  <input 
                    type="text" 
                    className={styles.specInput}
                    value={spec.key} 
                    onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                    placeholder="e.g. Weight"
                  />
                  <input 
                    type="text" 
                    className={styles.specInput}
                    value={spec.value} 
                    onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                    placeholder="e.g. 1kg"
                  />
                  <select 
                    className={styles.specInput}
                    value={spec.type}
                    onChange={(e) => updateSpec(idx, 'type', e.target.value)}
                  >
                    <option value="text">Plain Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                  </select>
                  <button className={styles.removeBtn} onClick={() => removeSpec(idx)} title="Remove spec">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {formData.specifications.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                  No specifications defined yet.
                </div>
              )}
            </div>
            <button className={styles.addBtn} onClick={addSpec}>
              <Plus size={16} /> Add Specification
            </button>
          </div>
        </SectionCard>

        <SectionCard 
          title="Relationships" 
          description={<>Link this product to templates or other products <Tooltip text="Manage how this product relates to retailers and master templates in the catalog." /></>}
          className={styles.bentoRelations}
        >
          <ToggleSwitch 
            label="Is Master Template?"
            description="If true, this product acts as a template for retailers."
            checked={formData.isMasterTemplate}
            onChange={(val) => setFormData({ ...formData, isMasterTemplate: val })}
          />
          <div style={{ marginTop: '16px' }}>
            <SelectField 
              label="Parent Template"
              options={allProducts.filter(p => p.id !== productId && p.isMasterTemplate).map(p => ({ label: p.title, value: p.id }))}
              value={formData.parentTemplate}
              onChange={(val) => setFormData({ ...formData, parentTemplate: val })}
            />
          </div>
          <div style={{ marginTop: '16px' }}>
            <CheckboxList 
              label="Related Products"
              options={allProducts.filter(p => p.id !== productId).map(p => ({ label: p.title, value: p.id }))}
              selectedValues={formData.relatedProducts || []}
              onChange={(vals) => setFormData({ ...formData, relatedProducts: vals })}
            />
          </div>
        </SectionCard>

        {/* Variants Configurator - Moved to bottom */}
        <SectionCard 
          title="Product Variants" 
          description={<>Manage different sizes, colors, and options for this product <Tooltip text="Enable this to create different variations of the product (e.g. Size M, Color Blue) each with their own price and stock." /></>}
          className={styles.bentoVariants}
        >
          <VariantsConfigurator 
            formData={formData}
            setFormData={setFormData}
            allVariantTypes={allVariantTypes}
            allVariantOptions={allVariantOptions}
          />
        </SectionCard>

      </div>
    </div>
  )
}
