'use client'

import React, { useState } from 'react'
import { Plus, X, Image as ImageIcon } from 'lucide-react'
import styles from './MultiMediaSelector.module.css'
import { MediaPickerModal } from '../MediaPickerModal'

export type MultiMediaSelectorProps = {
  label: React.ReactNode
  description?: string
  values: any[] // Array of { image: any, variantOption?: string, id?: string }
  onChange: (docs: any[]) => void
  validVariantOptions?: any[] // Options that can be linked
}

export const MultiMediaSelector: React.FC<MultiMediaSelectorProps> = ({
  label, description, values, onChange, validVariantOptions = []
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (selected: any | any[]) => {
    const newItems = Array.isArray(selected) ? selected : [selected]
    
    // Convert selected media docs to gallery item format
    const newGalleryItems = newItems.map(item => ({
      image: item,
      variantOption: null
    }))
    
    // Filter out duplicates based on image id
    const existingIds = new Set(values.map(v => v.image?.id))
    const uniqueNew = newGalleryItems.filter(item => !existingIds.has(item.image?.id))
    
    onChange([...values, ...uniqueNew])
  }

  const handleRemove = (indexToRemove: number) => {
    const newValues = [...values]
    newValues.splice(indexToRemove, 1)
    onChange(newValues)
  }

  const handleOptionChange = (index: number, optionId: string) => {
    const newValues = [...values]
    newValues[index] = { ...newValues[index], variantOption: optionId || null }
    onChange(newValues)
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      {description && <span className={styles.description}>{description}</span>}
      
      <div className={styles.grid}>
        {values.map((item, index) => {
          const media = item.image
          if (!media) return null
          
          return (
            <div key={item.id || index} className={styles.itemContainer}>
              <div className={styles.imageWrap}>
                <img src={media.url} alt={media.alt || 'Gallery image'} />
                <button 
                  className={styles.removeBtn} 
                  onClick={(e) => { e.preventDefault(); handleRemove(index); }}
                  title="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
              
              {validVariantOptions.length > 0 && (
                <select 
                  className={styles.optionSelect}
                  value={item.variantOption || ''}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  title="Link to a variant option"
                >
                  <option value="">All Variants</option>
                  {validVariantOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label || opt.value}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
        
        <div className={styles.addBtn} onClick={() => setIsOpen(true)}>
          <Plus size={24} />
          <span style={{ fontSize: '12px' }}>Add Media</span>
        </div>
      </div>

      <MediaPickerModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
        multi={true}
      />
    </div>
  )
}
