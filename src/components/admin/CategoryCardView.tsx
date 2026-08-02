'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Image as ImageIcon, Box, ListTree } from 'lucide-react'
import { useStepNav } from '@payloadcms/ui'
import styles from './CategoryCardView.module.css'

type CategoryDoc = {
  id: string
  title: string
  media?: {
    url?: string
    alt?: string
  } | string
  parentCategory?: {
    id: string
    title: string
  } | string
  brands?: any
  specificationTemplates?: any[]
  updatedAt?: string
  createdAt?: string
}

export default function CategoryCardView() {
  const { setStepNav } = useStepNav()
  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setStepNav([
      {
        label: 'Categories',
      },
    ])
  }, [setStepNav])

  useEffect(() => {
    let isSubscribed = true
    setIsLoading(true)
    fetch('/api/categories?limit=1000&depth=1')
      .then(res => res.json())
      .then(data => {
        if (!isSubscribed) return
        setCategories(data.docs || [])
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching categories:', err)
        setIsLoading(false)
      })

    return () => {
      isSubscribed = false
    }
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const query = searchQuery.toLowerCase()
    return categories.filter(cat => 
      cat.title?.toLowerCase().includes(query) ||
      (typeof cat.parentCategory === 'object' && cat.parentCategory?.title?.toLowerCase().includes(query))
    )
  }, [categories, searchQuery])

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Category Management</h1>
          <p className={styles.description}>Organize your product catalog with categories, subcategories, and specification templates.</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Link href="/admin/collections/categories/create" className={styles.addBtn}>
            <Plus size={18} /> Add Category
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div>Loading categories...</div>
      ) : (
        <section className={styles.grid}>
          {filteredCategories.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No categories found</h3>
              <p>Try adjusting your search or create a new category.</p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const mediaUrl = typeof category.media === 'object' ? category.media?.url : undefined
              const parentTitle = typeof category.parentCategory === 'object' ? category.parentCategory?.title : undefined
              const specCount = category.specificationTemplates?.length || 0
              const brandCount = Array.isArray(category.brands) 
                ? category.brands.length 
                : (category.brands?.totalDocs || category.brands?.docs?.length || 0)

              return (
                <article key={category.id} className={styles.card}>
                  <div className={styles.imageArea}>
                    {mediaUrl ? (
                      <img src={mediaUrl} alt={category.title} />
                    ) : (
                      <div className={styles.noImage}>
                        <ImageIcon size={48} opacity={0.5} />
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.cardContent}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.title}>{category.title}</h3>
                      {parentTitle && <span className={styles.parentBadge}>{parentTitle}</span>}
                    </div>
                    
                    <div className={styles.metaList}>
                      <div className={styles.metaItem}>
                        <ListTree size={14} />
                        <span>{specCount} Spec Template{specCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Box size={14} />
                        <span>{brandCount} Associated Brand{brandCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.cardFooter}>
                    <Link href={`/admin/collections/categories/${category.id}`} className={styles.editBtn}>
                      Edit Details
                    </Link>
                  </div>
                </article>
              )
            })
          )}
        </section>
      )}
    </main>
  )
}
