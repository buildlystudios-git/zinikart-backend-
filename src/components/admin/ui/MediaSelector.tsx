'use client'

import React, { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import styles from './MediaSelector.module.css'
import { MediaPickerModal } from '../MediaPickerModal'

export type MediaSelectorProps = {
  label: string
  description?: string
  value: any // Media document ID or object
  previewUrl?: string | null
  onChange: (doc: any) => void
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({ 
  label, description, value, previewUrl, onChange 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrl || null)

  const handleSelect = (doc: any) => {
    setLocalPreview(doc.url)
    onChange(doc)
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.preview} onClick={() => setIsOpen(true)}>
        {localPreview ? (
          <img src={localPreview} alt="Preview" className={styles.previewImg} />
        ) : (
          <div className={styles.emptyState}>
            <ImageIcon size={24} />
            <span>Select Image</span>
          </div>
        )}
        <div className={styles.overlay}>Change</div>
      </div>
      {description && <span className={styles.description}>{description}</span>}

      <MediaPickerModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  )
}
