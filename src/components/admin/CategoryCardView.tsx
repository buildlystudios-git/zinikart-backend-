'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Image as ImageIcon, LayoutGrid, Award, Package, ArrowRight, ChevronDown } from 'lucide-react'
import { useStepNav } from '@payloadcms/ui'
import styles from './CategoryCardView.module.css'
import { StatCard } from './ui/StatCard'
import { Pagination } from './ui/Pagination'

type CategoryDoc = {
  id: string
  title: string
  media?: {
    url?: string
    alt?: string
  } | string
  _productsCount?: number
  _brandsCount?: number
}

export default function CategoryCardView() {
  const { setStepNav } = useStepNav()
  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [sortOrder, setSortOrder] = useState('asc')
  
  const [stats, setStats] = useState({ categories: 0, brands: 0, products: 0 })

  useEffect(() => {
    setStepNav([{ label: 'Product Categories' }])
  }, [setStepNav])

  // Fetch Global Stats
  useEffect(() => {
    Promise.all([
      fetch('/api/categories?limit=0').then(res => res.json()),
      fetch('/api/brands?limit=0').then(res => res.json()),
      fetch('/api/products?limit=0').then(res => res.json())
    ]).then(([catData, brandData, prodData]) => {
      setStats({
        categories: catData.totalDocs || 0,
        brands: brandData.totalDocs || 0,
        products: prodData.totalDocs || 0
      })
    }).catch(console.error)
  }, [])

  // Fetch Categories
  useEffect(() => {
    let isSubscribed = true
    setIsLoading(true)
    fetch(`/api/categories?limit=9&page=${page}&depth=1&sort=${sortOrder === 'asc' ? 'title' : '-title'}`)
      .then(res => res.json())
      .then(async data => {
        if (!isSubscribed) return
        
        // We need product and brand counts for each category
        const cats = data.docs || []
        const withCounts = await Promise.all(cats.map(async (cat: any) => {
          try {
            const [countRes, brandCountRes] = await Promise.all([
              fetch(`/api/products?where[categories][in]=${cat.id}&limit=0`),
              fetch(`/api/brands?where[categories][in]=${cat.id}&limit=0`)
            ])
            const countData = await countRes.json()
            const brandData = await brandCountRes.json()
            return { ...cat, _productsCount: countData.totalDocs || 0, _brandsCount: brandData.totalDocs || 0 }
          } catch {
            return { ...cat, _productsCount: 0, _brandsCount: 0 }
          }
        }))
        
        if (isSubscribed) {
          setCategories(withCounts)
          setTotalPages(data.totalPages || 1)
          setTotalDocs(data.totalDocs || 0)
          setIsLoading(false)
        }
      })
      .catch(err => {
        console.error('Error fetching categories:', err)
        if (isSubscribed) setIsLoading(false)
      })

    return () => { isSubscribed = false }
  }, [page, sortOrder])

  // Client-side search filtering (or we could re-fetch with query, but simple filter works for now if user searches within current page, ideally should be server-side)
  // For production, this should trigger a new fetch with where[title][like], but for this view we'll keep it simple
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const query = searchQuery.toLowerCase()
    return categories.filter(cat => cat.title?.toLowerCase().includes(query))
  }, [categories, searchQuery])

  return (
    <main className={styles.shell}>
      <header className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <h1>Product Categories</h1>
          <p>Manage all product categories and browse products by category.</p>
        </div>
        <Link href="/admin/collections/categories/create" className={styles.addBtn}>
          <Plus size={16} /> Add Category
        </Link>
      </header>

      <div className={styles.statsRow}>
        <StatCard icon={LayoutGrid} title="Total Categories" value={stats.categories} subLabel="All product categories" color="green" />
        <StatCard icon={Award} title="Total Brands" value={stats.brands} subLabel="Across all categories" color="purple" />
        <StatCard icon={Package} title="Total Products" value={stats.products} subLabel="Across all categories" color="orange" />
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.sortWrap}>
          <span className={styles.sortLabel}>Sort by</span>
          <div className={styles.sortSelectWrap}>
            <select className={styles.sortSelect} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="asc">A to Z</option>
              <option value="desc">Z to A</option>
            </select>
            <ChevronDown size={14} className={styles.sortIcon} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading categories...</div>
      ) : (
        <>
          <section className={styles.grid}>
            {filteredCategories.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No categories found</h3>
                <p>Try adjusting your search or create a new category.</p>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const mediaUrl = typeof category.media === 'object' ? category.media?.url : undefined
                const brandCount = category._brandsCount || 0
                const prodCount = category._productsCount || 0

                return (
                  <article key={category.id} className={styles.card}>
                    <div className={styles.cardMain}>
                      <div className={styles.imageArea}>
                        {mediaUrl ? (
                          <img src={mediaUrl} alt={category.title} />
                        ) : (
                          <ImageIcon size={32} color="#d1d5db" />
                        )}
                      </div>
                      
                      <div className={styles.cardContent}>
                        <h3 className={styles.title}>{category.title}</h3>
                        
                        <div className={styles.metricsRow}>
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Brands</span>
                            <span className={styles.metricValue}>{brandCount}</span>
                          </div>
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Products</span>
                            <span className={styles.metricValue}>{prodCount}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Link href={`/admin/collections/categories/${category.id}`} className={styles.viewLink} style={{ marginRight: '16px' }}>
                            Edit Category
                          </Link>
                          <Link href={`/admin/categories/${category.id}/brands`} className={styles.viewLink}>
                            View Brands <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </section>

          <Pagination 
            page={page} 
            totalPages={totalPages} 
            totalDocs={totalDocs} 
            limit={9} 
            onPageChange={setPage} 
          />
        </>
      )}
    </main>
  )
}
