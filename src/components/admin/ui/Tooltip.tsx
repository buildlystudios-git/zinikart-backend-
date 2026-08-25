import React from 'react'
import styles from './Tooltip.module.css'

export const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className={styles.tooltipWrapper}>
      ?
      <div className={styles.tooltipContent}>
        {text}
      </div>
    </div>
  )
}
