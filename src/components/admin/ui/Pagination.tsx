import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  totalDocs?: number
  limit?: number
  onPageChange: (page: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, totalDocs, limit = 10, onPageChange }) => {
  if (totalPages <= 1 && (!totalDocs || totalDocs === 0)) return null

  const renderPageNumbers = () => {
    const pages = []
    
    // Simple logic for < 7 pages
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button 
            key={i} 
            className={`${styles.btn} ${page === i ? styles.active : ''}`}
            onClick={() => onPageChange(i)}
            disabled={page === i}
          >
            {i}
          </button>
        )
      }
    } else {
      // Logic for > 7 pages with ellipsis
      pages.push(
        <button key={1} className={`${styles.btn} ${page === 1 ? styles.active : ''}`} onClick={() => onPageChange(1)}>
          1
        </button>
      )

      if (page > 3) {
        pages.push(<span key="dots-1" className={styles.dots}>...</span>)
      }

      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(
          <button 
            key={i} 
            className={`${styles.btn} ${page === i ? styles.active : ''}`}
            onClick={() => onPageChange(i)}
            disabled={page === i}
          >
            {i}
          </button>
        )
      }

      if (page < totalPages - 2) {
        pages.push(<span key="dots-2" className={styles.dots}>...</span>)
      }

      pages.push(
        <button key={totalPages} className={`${styles.btn} ${page === totalPages ? styles.active : ''}`} onClick={() => onPageChange(totalPages)}>
          {totalPages}
        </button>
      )
    }

    return pages
  }

  const startItem = (page - 1) * limit + 1
  const endItem = totalDocs ? Math.min(page * limit, totalDocs) : (page * limit)

  return (
    <div className={styles.paginationWrap}>
      {totalDocs !== undefined && (
        <div className={styles.info}>
          Showing {totalDocs > 0 ? startItem : 0} to {totalDocs > 0 ? endItem : 0} of {totalDocs} items
        </div>
      )}
      <div className={styles.controls}>
        <button 
          className={styles.btn} 
          onClick={() => onPageChange(page - 1)} 
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        {renderPageNumbers()}
        <button 
          className={styles.btn} 
          onClick={() => onPageChange(page + 1)} 
          disabled={page >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
