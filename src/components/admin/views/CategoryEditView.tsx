'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'
import { SectionCard } from '../ui/SectionCard'
import { TextInput } from '../ui/TextInput'
import { MediaSelector } from '../ui/MediaSelector'
import { SelectField } from '../ui/SelectField'
import { CheckboxList } from '../ui/CheckboxList'
import styles from './CategoryEditView.module.css'

export const CategoryEditView: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const { setStepNav } = useStepNav()
  
  // Extract ID from Payload's catch-all segments parameter
  const segments = (params?.segments as string[]) || []
  const maybeId = segments.length > 0 ? segments[segments.length - 1] : null
  const isEditing = maybeId !== 'create' && maybeId !== 'categories'
  const categoryId = isEditing ? maybeId : null

  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<any>({
    title: '',
    media: null,
    parentCategory: 'none',
    specificationTemplates: [],
    brands: []
  })
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [allBrands, setAllBrands] = useState<any[]>([])
  const [initialBrands, setInitialBrands] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/categories?limit=100').then(r => r.json()).then(d => setAllCategories(d.docs || []))
    fetch('/api/brands?limit=100').then(r => r.json()).then(d => setAllBrands(d.docs || []))
  }, [])

  useEffect(() => {
    if (isEditing && categoryId) {
      setIsLoading(true)
      fetchCategory()
    } else if (!isEditing) {
      // Clear data if we navigate to "create"
      setFormData({
        title: '',
        media: null,
        parentCategory: 'none',
        specificationTemplates: [],
        brands: []
      })
      setMediaPreview(null)
      setInitialBrands([])
      setIsLoading(false)
    }
  }, [categoryId, isEditing])

  useEffect(() => {
    setStepNav([
      {
        label: 'Categories',
        url: '/admin/collections/categories'
      },
      {
        label: isEditing ? (formData.title || 'Edit Category') : 'Create New Category',
      }
    ])
  }, [setStepNav, isEditing, formData.title])

  const fetchCategory = async () => {
    try {
      // Append a timestamp to prevent aggressive browser caching on soft navigations
      const res = await fetch(`/api/categories/${categoryId}?t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        const brandsArray = data.brands ? (Array.isArray(data.brands) ? data.brands : (data.brands.docs || [])) : []
        const fetchedBrands = brandsArray.map((b: any) => typeof b === 'object' ? b.id : b)
        setFormData({
          title: data.title || '',
          media: typeof data.media === 'object' ? data.media?.id : data.media,
          parentCategory: (typeof data.parentCategory === 'object' ? data.parentCategory?.id : data.parentCategory) || 'none',
          specificationTemplates: data.specificationTemplates || [],
          brands: fetchedBrands
        })
        setInitialBrands(fetchedBrands)
        if (typeof data.media === 'object' && data.media?.url) {
          setMediaPreview(data.media.url)
        }
      }
    } catch (err) {
      console.error('Failed to fetch category:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url = isEditing ? `/api/categories/${categoryId}` : '/api/categories'
      const method = isEditing ? 'PATCH' : 'POST'
      
      const payload = {
        title: formData.title,
        media: formData.media === 'none' ? null : formData.media,
        parentCategory: formData.parentCategory === 'none' ? null : formData.parentCategory,
        specificationTemplates: formData.specificationTemplates
        // Join fields like 'brands' cannot be saved directly to the category doc.
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        const savedCategoryId = isEditing ? categoryId : data.doc.id
        
        // Update Join Relationships for Brands
        const addedBrands = formData.brands.filter((b: string) => !initialBrands.includes(b))
        const removedBrands = initialBrands.filter((b: string) => !formData.brands.includes(b))

        const updateBrand = async (brandId: string, action: 'add' | 'remove') => {
          try {
            const bRes = await fetch(`/api/brands/${brandId}`)
            const brand = await bRes.json()
            let currentCats = brand.categories ? brand.categories.map((c: any) => typeof c === 'object' ? c.id : c) : []
            if (action === 'add') currentCats.push(savedCategoryId)
            else currentCats = currentCats.filter((c: any) => c !== savedCategoryId)
            await fetch(`/api/brands/${brandId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ categories: currentCats })
            })
          } catch(e) { console.error('Error updating brand', e) }
        }

        await Promise.all([
          ...addedBrands.map((id: string) => updateBrand(id, 'add')),
          ...removedBrands.map((id: string) => updateBrand(id, 'remove'))
        ])

        if (!isEditing) {
          router.push(`/admin/collections/categories/${savedCategoryId}`)
          toast.success('Category created successfully!')
        } else {
          toast.success('Category saved successfully!')
          // refresh initial brands state
          setInitialBrands([...formData.brands])
        }
      } else {
        toast.error('Failed to save category. Please check your fields.')
      }
    } catch (err) {
      console.error(err)
      toast.error('An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSpecChange = (index: number, key: string, val: any) => {
    const newSpecs = [...formData.specificationTemplates]
    newSpecs[index] = { ...newSpecs[index], [key]: val }
    setFormData({ ...formData, specificationTemplates: newSpecs })
  }

  const addSpec = () => {
    setFormData({
      ...formData,
      specificationTemplates: [
        ...(formData.specificationTemplates || []),
        { name: '', type: 'text', required: false }
      ]
    })
  }

  const removeSpec = (index: number) => {
    const newSpecs = formData.specificationTemplates.filter((_: any, i: number) => i !== index)
    setFormData({ ...formData, specificationTemplates: newSpecs })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <h1>{isEditing ? `Edit Category: ${formData.title}` : 'Create New Category'}</h1>
          <p>Manage the details and product specifications for this category.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.cancelBtn} onClick={() => router.push('/admin/collections/categories')} type="button">
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving} type="button">
            {isSaving && <Loader2 className={styles.spinner} />}
            {isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <SectionCard 
          title="General Information" 
          description="Basic details about this category."
          className={styles.bentoGeneral}
        >
          <TextInput 
            label="Category Name"
            name="title"
            value={formData.title}
            onChange={(val) => setFormData({ ...formData, title: val })}
            required
            placeholder="e.g. Smartphones"
          />
          <MediaSelector 
            label="Category Image"
            description="Used as the thumbnail across the store."
            value={formData.media}
            previewUrl={mediaPreview}
            onChange={(doc) => {
              setFormData({ ...formData, media: doc.id })
              setMediaPreview(doc.url)
            }}
          />
          <SelectField 
            label="Parent Category"
            description="If this is a subcategory, select its parent."
            options={allCategories.filter(c => c.id !== categoryId).map(c => ({ label: c.title, value: c.id }))}
            value={formData.parentCategory}
            onChange={(val) => setFormData({ ...formData, parentCategory: val })}
          />
        </SectionCard>

        <SectionCard 
          title="Associated Brands" 
          description="Select the brands that offer products in this category."
          className={styles.bentoBrands}
        >
          <CheckboxList 
            label="Brands"
            options={allBrands.map(b => ({ label: b.name, value: b.id }))}
            selectedValues={formData.brands}
            onChange={(vals) => setFormData({ ...formData, brands: vals })}
          />
        </SectionCard>

        <SectionCard 
          title="Specification Templates" 
          description="Define the standard fields that products in this category should fill out."
          className={styles.bentoSpecs}
        >
          {formData.specificationTemplates?.length > 0 ? (
            <div className={styles.specsTable}>
              <div className={styles.specsHeader}>
                <div>Field Name</div>
                <div>Type</div>
                <div style={{ textAlign: 'center' }}>Required</div>
                <div></div>
              </div>
              {formData.specificationTemplates.map((spec: any, idx: number) => (
                <div 
                  key={idx} 
                  style={{ borderBottom: idx === formData.specificationTemplates.length - 1 ? 'none' : '1px solid #e5e7eb' }}
                >
                  <div className={styles.specRow} style={{ borderBottom: 'none', paddingBottom: spec.type === 'select' ? '8px' : '16px' }}>
                  <input 
                    type="text" 
                    value={spec.name || ''} 
                    onChange={(e) => handleSpecChange(idx, 'name', e.target.value)}
                    placeholder="e.g. RAM Size"
                    className={styles.specInput}
                  />
                  <select 
                    value={spec.type || 'text'} 
                    onChange={(e) => handleSpecChange(idx, 'type', e.target.value)}
                    className={styles.specInput}
                  >
                    <option value="text">Plain Text</option>
                    <option value="number">Numeric Value</option>
                    <option value="select">Preset Options</option>
                    <option value="date">Date</option>
                  </select>
                  <div className={styles.specCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={spec.required || false}
                      onChange={(e) => handleSpecChange(idx, 'required', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                  <button type="button" className={styles.removeBtn} onClick={() => removeSpec(idx)} title="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
                {spec.type === 'select' && (
                  <div className={styles.specOptionsRow} style={{ display: 'flex', padding: '0 16px 16px' }}>
                    <div style={{ flex: 1, padding: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                      <input 
                        type="text" 
                        value={(spec.options || []).map((o: any) => o.option).join(', ')} 
                        onChange={(e) => {
                          const valArray = e.target.value.split(',').map(s => ({ option: s.trim() })).filter(o => o.option !== '')
                          handleSpecChange(idx, 'options', valArray)
                        }}
                        placeholder="Comma-separated options (e.g. Red, Green, Blue)"
                        className={styles.specInput}
                        style={{ width: '100%', fontSize: '13px', background: '#ffffff', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', display: 'block' }}>Enter options separated by commas</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          ) : (
            <div className={styles.emptySpecs}>
              No specifications defined yet.
            </div>
          )}
          
          <button type="button" className={styles.addBtn} onClick={addSpec}>
            <Plus size={16} /> Add Specification
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
