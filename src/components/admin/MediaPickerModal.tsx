'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Search, Image as ImageIcon, UploadCloud, Loader2, File as FileIcon, Check } from 'lucide-react'
import styles from './MediaPickerModal.module.css'

export type MediaPickerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (doc: any | any[]) => void
  collectionSlug?: string
  multi?: boolean
}

export function MediaPickerModal({ isOpen, onClose, onSelect, collectionSlug = 'media', multi = false }: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [mediaItems, setMediaItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedDocs, setSelectedDocs] = useState<any[]>([])
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedDocs([])
      setActiveTab('library')
      fetchMedia()
    }
  }, [isOpen])

  const fetchMedia = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/${collectionSlug}?limit=100&sort=-createdAt`)
      if (res.ok) {
        const data = await res.json()
        setMediaItems(data.docs || [])
      }
    } catch (err) {
      console.error('Error fetching media:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return mediaItems
    const query = searchQuery.toLowerCase()
    return mediaItems.filter(item => 
      item.filename?.toLowerCase().includes(query) || 
      item.alt?.toLowerCase().includes(query)
    )
  }, [mediaItems, searchQuery])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleUpload(Array.from(files))
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUpload(Array.from(files))
    }
  }

  const handleUpload = async (files: File[]) => {
    if (!multi && files.length > 1) {
      files = [files[0]]
    }
    
    setIsUploading(true)
    
    try {
      const newDocs: any[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('_payload', JSON.stringify({ alt: file.name }))
        
        const res = await fetch(`/api/${collectionSlug}`, {
          method: 'POST',
          body: formData,
        })
        
        if (res.ok) {
          const data = await res.json()
          newDocs.push(data.doc)
        }
      }
      
      if (newDocs.length > 0) {
        if (!multi) {
          onSelect(newDocs[0])
          onClose()
        } else {
          // Add newly uploaded to selection and switch to library
          setSelectedDocs(prev => [...prev, ...newDocs])
          await fetchMedia()
          setActiveTab('library')
        }
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('An error occurred during upload.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleItemClick = (item: any) => {
    if (!multi) {
      onSelect(item)
      onClose()
    } else {
      setSelectedDocs(prev => {
        const exists = prev.find(d => d.id === item.id)
        if (exists) return prev.filter(d => d.id !== item.id)
        return [...prev, item]
      })
    }
  }

  const handleInsertMulti = () => {
    if (selectedDocs.length > 0) {
      onSelect(selectedDocs)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <ImageIcon size={22} color="#2563eb" />
            Select Media
          </div>
          <div className={styles.headerRight}>
            {activeTab === 'library' && (
              <div className={styles.searchWrap}>
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            <button onClick={onClose} className={styles.closeBtn} title="Close">
              <X size={22} />
            </button>
          </div>
        </header>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'library' ? styles.active : ''}`}
            onClick={() => setActiveTab('library')}
          >
            Media Library
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'upload' ? styles.active : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload New
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'library' && (
            isLoading ? (
              <div className={styles.loadingState}>
                <Loader2 size={36} className={styles.spinner} color="#2563eb" />
                <p style={{marginTop: '16px', fontWeight: 500, color: '#374151'}}>Loading media library...</p>
              </div>
            ) : filteredMedia.length > 0 ? (
              <div className={styles.grid}>
                {filteredMedia.map(item => {
                  const isSelected = selectedDocs.some(d => d.id === item.id)
                  return (
                    <div 
                      key={item.id} 
                      className={`${styles.mediaItem} ${isSelected ? styles.mediaItemSelected : ''}`} 
                      onClick={() => handleItemClick(item)}
                    >
                      {isSelected && <Check size={16} className={styles.checkIcon} strokeWidth={3} />}
                      <div className={styles.thumbnailWrap}>
                        {item.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                          <img src={item.url} alt={item.alt || item.filename} />
                        ) : (
                          <FileIcon size={48} color="#9ca3af" />
                        )}
                      </div>
                      <div className={styles.mediaInfo}>
                        <div className={styles.mediaFilename} title={item.filename}>{item.filename}</div>
                        <div className={styles.mediaDate}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <ImageIcon size={64} color="#d1d5db" />
                <p style={{marginTop: '20px', color: '#6b7280', fontSize: '15px'}}>No media found matching your search.</p>
              </div>
            )
          )}

          {activeTab === 'upload' && (
            <div 
              className={`${styles.dropZone} ${isDragging ? styles.dragActive : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={(e) => {
                if (!isDragging) fileInputRef.current?.click()
              }}
            >
              {isUploading ? (
                <div className={styles.loadingState}>
                  <Loader2 size={64} className={styles.spinner} color="#2563eb" />
                  <p style={{marginTop: '20px', fontWeight: 600, color: '#374151', fontSize: '16px'}}>Uploading to Library...</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={80} className={styles.uploadIcon} />
                  <div className={styles.dropTitle}>Drag & Drop files here</div>
                  <div className={styles.dropSubtitle}>or click anywhere in this area to browse your computer</div>
                  <button className={styles.browseBtn} onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}>
                    Browse Files
                  </button>
                  <input 
                    type="file" 
                    multiple={multi}
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className={styles.hiddenInput} 
                  />
                </>
              )}
            </div>
          )}
        </div>

        {multi && activeTab === 'library' && (
          <div className={styles.footer}>
            <div className={styles.selectionInfo}>
              {selectedDocs.length} {selectedDocs.length === 1 ? 'item' : 'items'} selected
            </div>
            <div className={styles.footerActions}>
              <button className={styles.cancelBtn} onClick={() => setSelectedDocs([])}>Clear</button>
              <button 
                className={styles.insertBtn} 
                disabled={selectedDocs.length === 0}
                onClick={handleInsertMulti}
              >
                Insert Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
