'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Star, Box, Edit2, Image as ImageIcon, Check, X, Loader2, Trash2 } from 'lucide-react'
import { useStepNav, toast } from '@payloadcms/ui'
import styles from './BrandSplitView.module.css'
import { MediaPickerModal } from './MediaPickerModal'

type BrandDoc = {
  id: string
  name: string
  logo?: {
    id?: string
    url?: string
    alt?: string
  } | string
  description?: string
  featured?: boolean
  categories?: any[]
  updatedAt?: string
  createdAt?: string
}

export default function BrandSplitView() {
  const { setStepNav } = useStepNav()
  const [brands, setBrands] = useState<BrandDoc[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false)

  useEffect(() => {
    setStepNav([
      {
        label: 'Brands',
      },
    ])
  }, [setStepNav])

  // Fetch Brands
  useEffect(() => {
    let isSubscribed = true
    setIsLoading(true)
    fetch('/api/brands?limit=1000&depth=1')
      .then(res => res.json())
      .then(data => {
        if (!isSubscribed) return
        const docs = data.docs || []
        setBrands(docs)
        if (docs.length > 0 && !selectedId) {
          setSelectedId(docs[0].id)
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching brands:', err)
        setIsLoading(false)
      })

    return () => {
      isSubscribed = false
    }
  }, []) // empty dependency array is fine here, we only fetch once on mount

  // Fetch Categories for Edit Mode
  useEffect(() => {
    fetch('/api/categories?limit=1000')
      .then(res => res.json())
      .then(data => setAllCategories(data.docs || []))
      .catch(err => console.error(err))
  }, [])

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands
    const query = searchQuery.toLowerCase()
    return brands.filter(brand => brand.name?.toLowerCase().includes(query))
  }, [brands, searchQuery])

  const selectedBrand = useMemo(() => {
    if (selectedId === 'new') return { id: 'new', name: 'New Brand' } as BrandDoc
    return brands.find(b => b.id === selectedId) || null
  }, [brands, selectedId])

  // Reset edit state when selection changes
  useEffect(() => {
    if (selectedId === 'new') return
    setIsEditing(false)
    if (selectedBrand) {
      setEditForm({
        name: selectedBrand.name || '',
        description: selectedBrand.description || '',
        featured: selectedBrand.featured || false,
        categories: (selectedBrand.categories || []).map(c => typeof c === 'object' ? c.id : c),
        logo: typeof selectedBrand.logo === 'object' ? selectedBrand.logo?.id : selectedBrand.logo
      })
      setLogoPreview(typeof selectedBrand.logo === 'object' && selectedBrand.logo?.url ? selectedBrand.logo.url : null)
    } else {
      setLogoPreview(null)
    }
  }, [selectedBrand])

  const handleSave = async () => {
    if (!selectedId) return
    setIsSaving(true)
    try {
      const isNew = selectedId === 'new'
      const url = isNew ? '/api/brands' : `/api/brands/${selectedId}`
      const method = isNew ? 'POST' : 'PATCH'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const data = await res.json()
        const savedId = isNew ? data.doc.id : selectedId
        
        // Refetch depth=1 to get the populated logo relation 
        const fetchRes = await fetch(`/api/brands/${savedId}?depth=1`)
        if (fetchRes.ok) {
          const updated = await fetchRes.json()
          if (isNew) {
            setBrands(prev => [updated, ...prev])
            setSelectedId(savedId)
          } else {
            setBrands(prev => prev.map(b => b.id === savedId ? updated : b))
          }
        }
        setIsEditing(false)
        toast.success(`Brand ${isNew ? 'created' : 'updated'} successfully.`)
      } else {
        toast.error(`Failed to ${isNew ? 'create' : 'update'} brand.`)
      }
    } catch (err) {
      console.error(err)
      toast.error('An error occurred while saving.')
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedId || selectedId === 'new') return
    if (!window.confirm('Are you sure you want to delete this brand?')) return
    try {
      const res = await fetch(`/api/brands/${selectedId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Brand deleted successfully.')
        setBrands(prev => prev.filter(b => b.id !== selectedId))
        setSelectedId(null)
      } else {
        toast.error('Failed to delete brand.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error deleting brand.')
    }
  }

  const handleCreateNew = () => {
    setSelectedId('new')
    setIsEditing(true)
    setEditForm({ name: '', description: '', featured: false, categories: [], logo: null })
    setLogoPreview(null)
  }

  const toggleCategory = (catId: string) => {
    setEditForm((prev: any) => {
      const cats = prev.categories || []
      if (cats.includes(catId)) {
        return { ...prev, categories: cats.filter((id: string) => id !== catId) }
      } else {
        return { ...prev, categories: [...cats, catId] }
      }
    })
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Brands</h1>
          <p className={styles.description}>Manage your brand catalog, logos, and featured status.</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
            <Search size={14} color="#6b7280" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={handleCreateNew} className={styles.addBtn} style={{ cursor: 'pointer', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} color="#ffffff" /> <span style={{ color: '#ffffff' }}>New Brand</span>
          </button>
        </div>
      </header>

      <div className={styles.splitPane}>
        {/* Master Pane */}
        <div className={styles.masterPane}>
          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Loading...</div>
          ) : (
            <div className={styles.masterList}>
              {filteredBrands.map((brand) => {
                const isActive = brand.id === selectedId
                const logoUrl = typeof brand.logo === 'object' ? brand.logo?.url : undefined

                return (
                  <div 
                    key={brand.id} 
                    className={`${styles.brandRow} ${isActive ? styles.active : ''}`}
                    onClick={() => setSelectedId(brand.id)}
                  >
                    <div className={styles.rowLogo}>
                      {logoUrl ? (
                        <img src={logoUrl} alt={brand.name} />
                      ) : (
                        <ImageIcon size={14} color="#9ca3af" />
                      )}
                    </div>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowTitle}>{brand.name}</span>
                    </div>
                    {brand.featured && <Star size={14} className={styles.featuredStar} fill="currentColor" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Pane */}
        <div className={styles.detailPane}>
          {!selectedBrand ? (
            <div className={styles.emptyDetail}>
              <Box size={32} />
              <p>Select a brand to view details</p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailIdentity}>
                  <div className={styles.detailLogo}>
                    {logoPreview ? (
                      <img src={logoPreview} alt={selectedBrand.name} />
                    ) : (
                      <ImageIcon size={24} color="#9ca3af" />
                    )}
                    {isEditing && (
                      <div 
                        className={styles.logoUploadOverlay} 
                        title="Change Logo"
                        onClick={() => setIsMediaPickerOpen(true)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.55)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          cursor: 'pointer'
                        }}
                      >
                        <span>Change</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className={styles.editInputTitle}
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                      />
                    ) : (
                      <>
                        <h2 className={styles.detailTitle}>{selectedBrand.name}</h2>
                        <span className={styles.detailId}>ID: {selectedBrand.id}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.actionButtons}>
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className={styles.cancelBtn} disabled={isSaving}>
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={handleSave} className={styles.saveBtn} disabled={isSaving}>
                        {isSaving ? <Loader2 size={14} className={styles.spinner} /> : <Check size={14} />} 
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleDelete} className={styles.cancelBtn} style={{ color: '#dc2626' }}>
                        <Trash2 size={14} /> Delete
                      </button>
                      <button onClick={() => setIsEditing(true)} className={styles.editAction}>
                        <Edit2 size={14} /> Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.detailBody}>
                <div className={styles.propertyGrid}>
                  <div className={styles.propertyLabel}>Description</div>
                  <div className={styles.propertyValue}>
                    {isEditing ? (
                      <textarea 
                        className={styles.editTextarea}
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        rows={4}
                      />
                    ) : (
                      selectedBrand.description ? (
                        selectedBrand.description
                      ) : (
                        <em style={{ color: '#9ca3af' }}>No description provided.</em>
                      )
                    )}
                  </div>

                  <div className={styles.propertyLabel}>Status</div>
                  <div className={styles.propertyValue}>
                    {isEditing ? (
                      <label className={styles.checkboxLabel}>
                        <input 
                          type="checkbox" 
                          checked={editForm.featured}
                          onChange={e => setEditForm({...editForm, featured: e.target.checked})}
                        />
                        Featured Brand
                      </label>
                    ) : (
                      selectedBrand.featured ? (
                        <span className={styles.featuredBadge}>
                          <Star size={12} fill="currentColor" /> Featured
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '13px' }}>Standard</span>
                      )
                    )}
                  </div>

                  <div className={styles.propertyLabel}>Categories</div>
                  <div className={styles.propertyValue}>
                    {isEditing ? (
                      <div className={styles.categoryChecklist}>
                        {allCategories.map(cat => (
                          <label key={cat.id} className={styles.checkboxLabel}>
                            <input 
                              type="checkbox"
                              checked={(editForm.categories || []).includes(cat.id)}
                              onChange={() => toggleCategory(cat.id)}
                            />
                            {cat.title}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.categoryPills}>
                        {selectedBrand.categories && selectedBrand.categories.length > 0 ? (
                          selectedBrand.categories.map((cat: any, i: number) => {
                            const title = typeof cat === 'object' ? cat.title : cat
                            return <span key={i} className={styles.categoryPill}>{title}</span>
                          })
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '13px' }}>None</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {!isEditing && (
                    <>
                      <div className={styles.propertyLabel}>Created</div>
                      <div className={styles.propertyValue}>
                        {selectedBrand.createdAt ? new Date(selectedBrand.createdAt).toLocaleString() : '—'}
                      </div>
                      
                      <div className={styles.propertyLabel}>Last Updated</div>
                      <div className={styles.propertyValue}>
                        {selectedBrand.updatedAt ? new Date(selectedBrand.updatedAt).toLocaleString() : '—'}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <MediaPickerModal 
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={(doc) => {
                  setEditForm((prev: any) => ({ ...prev, logo: doc.id }))
                  setLogoPreview(doc.url)
                }}
              />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
