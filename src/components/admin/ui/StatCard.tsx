import React from 'react'
import { LucideIcon } from 'lucide-react'
import styles from './StatCard.module.css'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  subLabel: string
  color: 'green' | 'purple' | 'orange'
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subLabel, color }) => {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.iconBox} ${styles[color]}`}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <div className={styles.statContent}>
        <h3 className={styles.statTitle}>{title}</h3>
        <p className={styles.statValue}>{typeof value === 'number' ? new Intl.NumberFormat('en-IN').format(value) : value}</p>
        <p className={styles.statSub}>{subLabel}</p>
      </div>
    </div>
  )
}
