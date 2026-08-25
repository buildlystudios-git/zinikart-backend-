'use client'

import React from 'react'
import styles from './CheckboxList.module.css'

export type CheckboxOption = {
  label: React.ReactNode
  value: string
}

export type CheckboxListProps = {
  label: React.ReactNode
  description?: string
  options: CheckboxOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
}

export const CheckboxList: React.FC<CheckboxListProps> = ({ 
  label, description, options, selectedValues, onChange 
}) => {
  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val))
    } else {
      onChange([...selectedValues, val])
    }
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      {description && <span className={styles.description}>{description}</span>}
      <div className={styles.list}>
        {options.length === 0 ? (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>No options available.</span>
        ) : (
          options.map(opt => (
            <label key={opt.value} className={styles.item}>
              <input 
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
