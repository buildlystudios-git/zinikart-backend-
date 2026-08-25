'use client'

import React from 'react'
import styles from './TextInput.module.css'

export type TextInputProps = {
  label: React.ReactNode
  name: string
  value: string
  onChange: (val: string) => void
  required?: boolean
  description?: string
  placeholder?: string
  type?: string
}

export const TextInput: React.FC<TextInputProps> = ({ 
  label, name, value, onChange, required, description, placeholder, type 
}) => {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type || "text"}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
      {description && <div className={styles.description}>{description}</div>}
    </div>
  )
}
