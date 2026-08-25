import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import styles from './Breadcrumb.module.css'

interface BreadcrumbItem {
  label: string | React.ReactNode
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? styles.current : ''}>{item.label}</span>
            )}
            
            {!isLast && (
              <ChevronRight size={14} className={styles.separator} />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
