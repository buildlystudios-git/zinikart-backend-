'use client'

import React from 'react'
import styles from './SelectField.module.css'

export type SelectOption = {
  label: React.ReactNode
  value: string
}

export type SelectFieldProps = {
  label: React.ReactNode
  description?: string
  options: SelectOption[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export const SelectField: React.FC<SelectFieldProps> = ({ 
  label, description, options, value, onChange, placeholder 
}) => {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select 
        className={styles.input}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        <option value="none">None</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {description && <span className={styles.description}>{description}</span>}
    </div>
  )
}
