'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Image as ImageIcon, ChevronDown, Edit2, MoreVertical } from 'lucide-react'
import { useStepNav } from '@payloadcms/ui'
import styles from './CategoryBrandProductsView.module.css'
import { Pagination } from '../ui/Pagination'

type ProductDoc = {
  id: string
  title: string
  gallery?: { image?: { url?: string } }[]
  variants?: any[]
  priceInINR?: number
  retailer?: string | object
}

export default function CategoryBrandProductsView() {
  const { setStepNav } = useStepNav()
  const params = useParams()
  
  // Extract categoryId and brandId from URL segments
  // Path is /categories/:categoryId/brands/:brandId/products
  const segments = (params?.segments as string[]) || []
  const catIndex = segments.indexOf('categories')
  const brandIndex = segments.indexOf('brands')
  
  const categoryId = catIndex !== -1 && segments.length > catIndex + 1 ? segments[catIndex + 1] : null
  const brandId = brandIndex !== -1 && segments.length > brandIndex + 1 ? segments[brandIndex + 1] : null

  const [categoryName, setCategoryName] = useState('Loading...')
  const [brandName, setBrandName] = useState('Loading...')
  const [products, setProducts] = useState<ProductDoc[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('-createdAt')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  useEffect(() => {
    if (categoryName !== 'Loading...' && brandName !== 'Loading...') {
      setStepNav([
        { label: 'Categories', url: '/admin/collections/categories' },
        { label: categoryName, url: `/admin/collections/categories/${categoryId}` },
        { label: 'Brands', url: `/admin/categories/${categoryId}/brands` },
        { label: brandName, url: `/admin/collections/brands/${brandId}` },
        { label: 'Products', url: '' }
      ])
    }
  }, [setStepNav, categoryName, brandName, categoryId, brandId])

  // Fetch Names
  useEffect(() => {
    if (!categoryId || !brandId) return

    fetch(`/api/categories/${categoryId}`).then(res => res.json()).then(data => setCategoryName(data.title || 'Category')).catch(console.error)
    fetch(`/api/brands/${brandId}`).then(res => res.json()).then(data => setBrandName(data.name || 'Brand')).catch(console.error)
  }, [categoryId, brandId])

  // Fetch Products
  useEffect(() => {
    if (!categoryId || !brandId) return

    let isSubscribed = true
    setIsLoading(true)
    
    let query = `/api/products?where[categories][in]=${categoryId}&where[brand][equals]=${brandId}&depth=1&limit=10&page=${page}&sort=${sortOrder}`
    
    if (statusFilter !== 'all') {
      query += `&where[_status][equals]=${statusFilter}`
    }

    fetch(query)
      .then(res => res.json())
      .then(data => {
        if (!isSubscribed) return
        setProducts(data.docs || [])
        setTotalPages(data.totalPages || 1)
        setTotalDocs(data.totalDocs || 0)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching products:', err)
        if (isSubscribed) setIsLoading(false)
      })

    return () => { isSubscribed = false }
  }, [categoryId, brandId, page, sortOrder, statusFilter])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const query = searchQuery.toLowerCase()
    return products.filter(p => p.title?.toLowerCase().includes(query))
  }, [products, searchQuery])

  if (!categoryId || !brandId) {
    return <div className={styles.shell}>Invalid Route</div>
  }

  return (
    <main className={styles.shell}>


      <header className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <h1>{brandName} Products</h1>
          <p>Manage all products under {brandName} brand.</p>
        </div>
        <Link href="/admin/collections/products/create" className={styles.addBtn}>
          <Plus size={16} /> Add Product
        </Link>
      </header>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} color="#9ca3af" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.filtersRight}>
          <div className={styles.selectWrap}>
            <select className={styles.selectField} disabled>
              <option>Brand: {brandName}</option>
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>
          
          <div className={styles.selectWrap}>
            <select className={styles.selectField} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>

          <div className={styles.selectWrap}>
            <select className={styles.selectField} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="-createdAt">Sort: Newest First</option>
              <option value="createdAt">Sort: Oldest First</option>
              <option value="priceInINR">Price: Low to High</option>
              <option value="-priceInINR">Price: High to Low</option>
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>


        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variants</th>
              <th>Price</th>
              <th>Uploaded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.loading}>Loading products...</div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>No products found.</div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const firstImage = product.gallery?.[0]?.image?.url
                const variantCount = Array.isArray(product.variants) ? product.variants.length : 0
                const price = product.priceInINR ? `₹${new Intl.NumberFormat('en-IN').format(product.priceInINR)}` : 'N/A'
                
                // Determine uploader role based on 'retailer' field presence
                const isRetailer = !!product.retailer
                const uploaderBadgeClass = isRetailer ? styles.retailer : styles.admin
                const uploaderLabel = isRetailer ? 'RETAILER' : 'ADMIN'

                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        <div className={styles.productImage}>
                          {firstImage ? (
                            <img src={firstImage} alt={product.title} />
                          ) : (
                            <ImageIcon size={20} color="#d1d5db" />
                          )}
                        </div>
                        <Link href={`/admin/collections/products/${product.id}`} className={styles.productTitle}>
                          {product.title}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className={styles.variantsText}>{variantCount} Variants</span>
                    </td>
                    <td>
                      <div className={styles.priceBlock}>
                        <span className={styles.priceValue}>{price}</span>
                        {product.priceInINR && <span className={styles.priceSub}>starting</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${uploaderBadgeClass}`}>
                        {uploaderLabel}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <Link href={`/admin/collections/products/${product.id}`} className={styles.actionBtn}>
                          <Edit2 size={14} />
                        </Link>
                        <button className={styles.actionBtn}>
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && (
        <Pagination 
          page={page} 
          totalPages={totalPages} 
          totalDocs={totalDocs} 
          limit={10} 
          onPageChange={setPage} 
        />
      )}
    </main>
  )
}
