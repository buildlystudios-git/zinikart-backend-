'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import styles from './ActionBar.module.css'

export type ActionBarProps = {
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
  saveLabel?: string
  cancelLabel?: string
}

export const ActionBar: React.FC<ActionBarProps> = ({ 
  onSave, onCancel, isSaving, saveLabel = 'Save Changes', cancelLabel = 'Cancel' 
}) => {
  return (
    <div className={styles.bar}>
      <button 
        className={`${styles.btn} ${styles.cancel}`} 
        onClick={onCancel}
        disabled={isSaving}
        type="button"
      >
        {cancelLabel}
      </button>
      <button 
        className={`${styles.btn} ${styles.save}`} 
        onClick={onSave}
        disabled={isSaving}
        type="button"
      >
        {isSaving && <Loader2 size={16} className={styles.spinner} />}
        {saveLabel}
      </button>
    </div>
  )
}
