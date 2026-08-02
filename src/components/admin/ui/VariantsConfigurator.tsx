'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Check, RefreshCw } from 'lucide-react'
import { SelectField } from './SelectField'
import { ToggleSwitch } from './ToggleSwitch'
import { TextInput } from './TextInput'
import { toast } from '@payloadcms/ui'

export type VariantsConfiguratorProps = {
  formData: any
  setFormData: (data: any) => void
  allVariantTypes: any[]
  allVariantOptions: any[]
}

export const VariantsConfigurator: React.FC<VariantsConfiguratorProps> = ({
  formData, setFormData, allVariantTypes, allVariantOptions
}) => {
  
  if (!formData.enableVariants) {
    return (
      <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>Variants are currently disabled for this product.</p>
        <ToggleSwitch 
          label="Enable Variants"
          checked={formData.enableVariants}
          onChange={(val) => setFormData({ ...formData, enableVariants: val })}
        />
      </div>
    )
  }

  // Find valid options based on selected types
  const validOptions = allVariantOptions.filter(opt => {
    const typeId = typeof opt.variantType === 'object' ? opt.variantType?.id : opt.variantType
    return (formData.variantTypes || []).includes(typeId)
  })

  // Handle multi-select for variant types
  const toggleType = (id: string) => {
    const types = formData.variantTypes || []
    if (types.includes(id)) {
      setFormData({ ...formData, variantTypes: types.filter((t: string) => t !== id) })
    } else {
      if (types.length >= 2) {
        toast.error('Maximum of 2 Variant Types allowed for matrix configuration.')
        return
      }
      setFormData({ ...formData, variantTypes: [...types, id] })
    }
  }

  // Get active types for the UI
  const activeTypes = (formData.variantTypes || []).map((id: string) => allVariantTypes.find(t => t.id === id)).filter(Boolean)

  // Group available options by type
  const optionsByType: Record<string, any[]> = {}
  activeTypes.forEach((t: any) => {
    optionsByType[t.id] = validOptions.filter(opt => {
      const typeId = typeof opt.variantType === 'object' ? opt.variantType?.id : opt.variantType
      return typeId === t.id
    })
  })

  const autoGenerateCombinations = () => {
    if (activeTypes.length === 0) {
      toast.error("Please select at least one Variant Type first.")
      return
    }

    // Check if any active type has zero options
    for (const type of activeTypes) {
      if (!optionsByType[type.id] || optionsByType[type.id].length === 0) {
        toast.error(`No options available for type "${type.label || type.name}". Please ensure options exist.`)
        return
      }
    }

    // Generate cartesian product
    const generate = (typeIndex: number, currentCombo: string[]): string[][] => {
      if (typeIndex === activeTypes.length) {
        return [currentCombo]
      }
      
      const typeId = activeTypes[typeIndex].id
      const options = optionsByType[typeId]
      const results: string[][] = []
      
      for (const opt of options) {
        const combos = generate(typeIndex + 1, [...currentCombo, opt.id])
        results.push(...combos)
      }
      
      return results
    }

    const combinations = generate(0, [])
    
    // Merge with existing
    const existingVariants = formData.variants || []
    const newVariants = [...existingVariants]
    let addedCount = 0

    for (const combo of combinations) {
      // Check if this combo already exists (ignoring order)
      const exists = existingVariants.some((v: any) => {
        const vOpts = (v.options || []).map((o: any) => typeof o === 'object' ? o.id : o)
        if (vOpts.length !== combo.length) return false
        return combo.every(cId => vOpts.includes(cId))
      })

      if (!exists) {
        const title = combo.map(id => {
          const opt = allVariantOptions.find(o => o.id === id)
          return opt ? (opt.label || opt.value) : ''
        }).filter(Boolean).join(' - ')

        newVariants.push({
          options: combo,
          priceInINREnabled: true,
          priceInINR: formData.priceInINR || 0,
          inventory: formData.inventory || 0,
          title
        })
        addedCount++
      }
    }

    setFormData({ ...formData, variants: newVariants })
    if (addedCount > 0) toast.success(`Generated ${addedCount} new combination(s).`)
  }

  // Helper to find a specific variant from the options
  const getVariantByOptions = (optIds: string[]) => {
    return (formData.variants || []).find((v: any) => {
      const vOpts = (v.options || []).map((o: any) => typeof o === 'object' ? o.id : o)
      if (vOpts.length !== optIds.length) return false
      return optIds.every(id => vOpts.includes(id))
    })
  }

  // Update a specific variant combination
  const updateCellVariant = (optIds: string[], field: string, value: any) => {
    const variants = [...(formData.variants || [])]
    const existingIndex = variants.findIndex((v: any) => {
      const vOpts = (v.options || []).map((o: any) => typeof o === 'object' ? o.id : o)
      if (vOpts.length !== optIds.length) return false
      return optIds.every(id => vOpts.includes(id))
    })

    if (existingIndex >= 0) {
      variants[existingIndex][field] = value
      variants[existingIndex].priceInINREnabled = true
    } else {
      const title = optIds.map(id => {
        const opt = allVariantOptions.find(o => o.id === id)
        return opt ? (opt.label || opt.value) : ''
      }).filter(Boolean).join(' - ')

      variants.push({
        options: optIds,
        priceInINREnabled: true,
        priceInINR: field === 'priceInINR' ? value : (formData.priceInINR || 0),
        inventory: field === 'inventory' ? value : 0,
        title
      })
    }
    setFormData({ ...formData, variants })
  }

  // Toggle variant on/off
  const toggleCellActive = (optIds: string[], isActive: boolean) => {
    let variants = [...(formData.variants || [])]
    const existingIndex = variants.findIndex((v: any) => {
      const vOpts = (v.options || []).map((o: any) => typeof o === 'object' ? o.id : o)
      if (vOpts.length !== optIds.length) return false
      return optIds.every(id => vOpts.includes(id))
    })

    if (isActive && existingIndex === -1) {
      const title = optIds.map(id => {
        const opt = allVariantOptions.find(o => o.id === id)
        return opt ? (opt.label || opt.value) : ''
      }).filter(Boolean).join(' - ')

      variants.push({
        options: optIds,
        priceInINREnabled: true,
        priceInINR: formData.priceInINR || 0,
        inventory: 0,
        title
      })
    } else if (!isActive && existingIndex >= 0) {
      variants.splice(existingIndex, 1)
    }
    setFormData({ ...formData, variants })
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Variants Enabled</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Configure up to 2 variant types for a matrix layout.</p>
        </div>
        <ToggleSwitch 
          checked={formData.enableVariants}
          onChange={(val) => setFormData({ ...formData, enableVariants: val })}
        />
      </div>

      {/* Step 1: Types */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>1. Variant Types (Axes)</h4>
          <span style={{ fontSize: '12px', color: activeTypes.length === 2 ? '#ef4444' : '#6b7280', fontWeight: 500 }}>
            {activeTypes.length}/2 selected
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Select up to 2 attributes (e.g., Color and Size).</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allVariantTypes.map(type => {
            const isSelected = (formData.variantTypes || []).includes(type.id)
            const isDisabled = !isSelected && activeTypes.length >= 2
            return (
              <button
                key={type.id}
                disabled={isDisabled}
                onClick={(e) => { e.preventDefault(); toggleType(type.id); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  border: `1px solid ${isSelected ? '#2563eb' : (isDisabled ? '#f3f4f6' : '#d1d5db')}`,
                  background: isSelected ? '#eff6ff' : (isDisabled ? '#f9fafb' : 'white'),
                  color: isSelected ? '#2563eb' : (isDisabled ? '#d1d5db' : '#374151'),
                  opacity: isDisabled ? 0.6 : 1
                }}
              >
                {type.label || type.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: SKU Matrix */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>2. SKU Matrix</h4>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              Toggle cells on/off to create combinations.
            </p>
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); autoGenerateCombinations(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', color: '#047857', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Enable All
          </button>
        </div>

        {activeTypes.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Select variant types above to see the configuration matrix.</p>
          </div>
        )}

        {/* 1D Layout */}
        {activeTypes.length === 1 && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px', gap: '12px', background: '#f9fafb', padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>
              <div>Active</div>
              <div>{activeTypes[0].label || activeTypes[0].name}</div>
              <div>Price (INR)</div>
              <div>Stock</div>
            </div>
            
            {optionsByType[activeTypes[0].id]?.map((opt) => {
              const variant = getVariantByOptions([opt.id])
              const isActive = !!variant
              
              return (
                <div key={opt.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px', gap: '12px', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: isActive ? 'white' : '#f9fafb', opacity: isActive ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={(e) => toggleCellActive([opt.id], e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{opt.label || opt.value}</div>
                  
                  <input 
                    type="number" 
                    disabled={!isActive}
                    value={variant?.priceInINR || ''}
                    placeholder={formData.priceInINR?.toString() || '0'}
                    onChange={(e) => updateCellVariant([opt.id], 'priceInINR', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', background: isActive ? 'white' : '#f3f4f6', color: '#111827' }}
                  />
                  
                  <input 
                    type="number" 
                    disabled={!isActive}
                    value={variant?.inventory || 0}
                    onChange={(e) => updateCellVariant([opt.id], 'inventory', parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', background: isActive ? 'white' : '#f3f4f6', color: '#111827' }}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* 2D Layout */}
        {activeTypes.length === 2 && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minWidth: '120px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>{activeTypes[0].label || activeTypes[0].name} (↓)</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{activeTypes[1].label || activeTypes[1].name} (→)</div>
                  </th>
                  {optionsByType[activeTypes[1].id]?.map(colOpt => (
                    <th key={colOpt.id} style={{ padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', minWidth: '160px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {colOpt.label || colOpt.value}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {optionsByType[activeTypes[0].id]?.map(rowOpt => (
                  <tr key={rowOpt.id}>
                    <td style={{ padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {rowOpt.label || rowOpt.value}
                    </td>
                    {optionsByType[activeTypes[1].id]?.map(colOpt => {
                      const variant = getVariantByOptions([rowOpt.id, colOpt.id])
                      const isActive = !!variant
                      
                      return (
                        <td key={colOpt.id} style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', background: isActive ? 'white' : '#f9fafb', opacity: isActive ? 1 : 0.7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: isActive ? '#059669' : '#6b7280', fontWeight: 500 }}>
                              <input 
                                type="checkbox" 
                                checked={isActive}
                                onChange={(e) => toggleCellActive([rowOpt.id, colOpt.id], e.target.checked)}
                                style={{ margin: 0, width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              {isActive ? 'Active' : 'Off'}
                            </label>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af', width: '32px' }}>₹</span>
                              <input 
                                type="number"
                                disabled={!isActive}
                                value={variant?.priceInINR || ''}
                                placeholder={formData.priceInINR?.toString() || '0'}
                                onChange={(e) => updateCellVariant([rowOpt.id, colOpt.id], 'priceInINR', parseFloat(e.target.value) || 0)}
                                style={{ flex: 1, minWidth: 0, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', background: isActive ? 'white' : '#f3f4f6', color: '#111827' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af', width: '32px' }}>Qty</span>
                              <input 
                                type="number"
                                disabled={!isActive}
                                value={variant?.inventory || 0}
                                onChange={(e) => updateCellVariant([rowOpt.id, colOpt.id], 'inventory', parseInt(e.target.value) || 0)}
                                style={{ flex: 1, minWidth: 0, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', background: isActive ? 'white' : '#f3f4f6', color: '#111827' }}
                              />
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
