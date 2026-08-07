'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Image as ImageIcon, Store, Package, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react'
import { useStepNav } from '@payloadcms/ui'
import styles from './CategoryBrandsView.module.css'
import { StatCard } from '../ui/StatCard'
import { Pagination } from '../ui/Pagination'

type BrandDoc = {
  id: string
  name: string
  logo?: {
    url?: string
  } | string
  _productsCount?: number
}

export default function CategoryBrandsView() {
  const { setStepNav } = useStepNav()
  const params = useParams()
  
  // Extract categoryId from URL segments
  // Path is /categories/:categoryId/brands
  const segments = (params?.segments as string[]) || []
  const catIndex = segments.indexOf('categories')
  const categoryId = catIndex !== -1 && segments.length > catIndex + 1 ? segments[catIndex + 1] : null

  const [categoryName, setCategoryName] = useState('Loading...')
  const [brands, setBrands] = useState<BrandDoc[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [sortOrder, setSortOrder] = useState('asc')
  
  const [stats, setStats] = useState({ brands: 0, products: 0, outOfStock: 0 })

  useEffect(() => {
    if (categoryName !== 'Loading...') {
      setStepNav([
        { label: 'Categories', url: '/admin/collections/categories' },
        { label: categoryName, url: `/admin/collections/categories/${categoryId}` },
        { label: 'Brands', url: '' }
      ])
    }
  }, [setStepNav, categoryName, categoryId])

  // Fetch Category Name and Global Stats
  useEffect(() => {
    if (!categoryId) return

    Promise.all([
      fetch(`/api/categories/${categoryId}`).then(res => res.json()),
      fetch(`/api/brands?where[categories][in]=${categoryId}&limit=0`).then(res => res.json()),
      fetch(`/api/products?where[categories][in]=${categoryId}&limit=0`).then(res => res.json()),
      fetch(`/api/products?where[categories][in]=${categoryId}&where[inventory][less_than_or_equal]=0&limit=0`).then(res => res.json())
    ]).then(([catData, brandData, prodData, oosData]) => {
      setCategoryName(catData.title || 'Category')
      setStats({
        brands: brandData.totalDocs || 0,
        products: prodData.totalDocs || 0,
        outOfStock: oosData.totalDocs || 0
      })
    }).catch(console.error)
  }, [categoryId])

  // Fetch Brands with Pagination
  useEffect(() => {
    if (!categoryId) return

    let isSubscribed = true
    setIsLoading(true)
    fetch(`/api/brands?where[categories][in]=${categoryId}&limit=12&page=${page}&depth=1&sort=${sortOrder === 'asc' ? 'name' : '-name'}`)
      .then(res => res.json())
      .then(async data => {
        if (!isSubscribed) return
        
        // We need product counts for each brand in this category
        const docs = data.docs || []
        const withCounts = await Promise.all(docs.map(async (brand: any) => {
          try {
            const countRes = await fetch(`/api/products?where[categories][in]=${categoryId}&where[brand][equals]=${brand.id}&limit=0`)
            const countData = await countRes.json()
            return { ...brand, _productsCount: countData.totalDocs || 0 }
          } catch {
            return { ...brand, _productsCount: 0 }
          }
        }))
        
        if (isSubscribed) {
          setBrands(withCounts)
          setTotalPages(data.totalPages || 1)
          setTotalDocs(data.totalDocs || 0)
          setIsLoading(false)
        }
      })
      .catch(err => {
        console.error('Error fetching brands:', err)
        if (isSubscribed) setIsLoading(false)
      })

    return () => { isSubscribed = false }
  }, [categoryId, page, sortOrder])

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands
    const query = searchQuery.toLowerCase()
    return brands.filter(b => b.name?.toLowerCase().includes(query))
  }, [brands, searchQuery])

  if (!categoryId) {
    return <div className={styles.shell}>Invalid Category Route</div>
  }

  return (
    <main className={styles.shell}>


      <header className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <h1>{categoryName} Brands</h1>
          <p>Manage all brands under {categoryName} category.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/collections/brands/create" className={styles.addBtn}>
            <Plus size={16} /> Add Brand
          </Link>
        </div>
      </header>

      <div className={styles.statsRow}>
        <StatCard icon={Store} title="Total Brands" value={stats.brands} subLabel={`Across ${categoryName}`} color="green" />
        <StatCard icon={Package} title="Total Products" value={stats.products} subLabel="Across all brands" color="purple" />
        <StatCard icon={AlertTriangle} title="Out of Stock Products" value={stats.outOfStock} subLabel="Across all brands" color="orange" />
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search brand name..."
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
        <div className={styles.loading}>Loading brands...</div>
      ) : (
        <>
          <section className={styles.grid}>
            {filteredBrands.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No brands found</h3>
                <p>Try adjusting your search or add a new brand to this category.</p>
              </div>
            ) : (
              filteredBrands.map((brand) => {
                const logoUrl = typeof brand.logo === 'object' ? brand.logo?.url : undefined
                const prodCount = brand._productsCount || 0

                return (
                  <article key={brand.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.logoArea}>
                        {logoUrl ? (
                          <img src={logoUrl} alt={brand.name} />
                        ) : (
                          <ImageIcon size={20} color="#d1d5db" />
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={styles.brandName}>{brand.name}</div>
                      </div>
                    </div>
                    
                    <div className={styles.cardContent}>
                      <span className={styles.metricLabel}>Products</span>
                      <span className={styles.metricValue}>{prodCount}</span>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link href={`/admin/collections/brands/${brand.id}`} className={styles.viewLink} style={{ marginRight: '16px' }}>
                        Edit Brand
                      </Link>
                      <Link href={`/admin/categories/${categoryId}/brands/${brand.id}/products`} className={styles.viewLink}>
                        View Products <ArrowRight size={14} />
                      </Link>
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
            limit={12} 
            onPageChange={setPage} 
          />
        </>
      )}
    </main>
  )
}
