'use client'

import React from 'react'
import styles from './ToggleSwitch.module.css'

export type ToggleSwitchProps = {
  label: React.ReactNode
  description?: string
  checked: boolean
  onChange: (val: boolean) => void
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange }) => {
  return (
    <div className={styles.field}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <button 
        type="button" 
        className={`${styles.switch} ${checked ? styles.checked : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  )
}
