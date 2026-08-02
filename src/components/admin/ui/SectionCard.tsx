import React from 'react'
import styles from './SectionCard.module.css'

export type SectionCardProps = {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, description, children, className }) => {
  return (
    <div className={`${styles.card} ${className || ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}
