import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

type Sweet = {
  id: number
  name: string
  sweet_type: 'weight' | 'count'
  price_per_kg?: string
  price_per_unit?: string
  usage_count?: number
  last_used?: string
  created_at?: string
}

type ProductMaster = {
  id: number
  name: string
  product_type: 'weight' | 'count'
  price_per_kg?: string
  price_per_unit?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type DropdownItem = Sweet | ProductMaster

interface SweetDropdownProps {
  sweets: Sweet[]
  products?: ProductMaster[]
  value: string
  onChange: (value: string, item?: DropdownItem) => void
  placeholder?: string
  style?: React.CSSProperties
}

export default function SweetDropdown({ sweets, products = [], value, onChange, placeholder = "Type sweet name", style }: SweetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredItems, setFilteredItems] = useState<DropdownItem[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  // Helper function to check if item is a Sweet
  const isSweet = (item: DropdownItem): item is Sweet => {
    return 'sweet_type' in item
  }

  // Helper function to get item type
  const getItemType = (item: DropdownItem): 'weight' | 'count' => {
    return isSweet(item) ? item.sweet_type : item.product_type
  }

  // Combine and sort all items (products first, then sweets by popularity)
  const sortedItems = [
    // Products first (from master list)
    ...products.filter(p => p.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    // Then sweets sorted by popularity
    ...sweets.sort((a, b) => {
      // First by usage count (descending)
      const usageA = a.usage_count || 0
      const usageB = b.usage_count || 0
      if (usageA !== usageB) return usageB - usageA
      
      // Then by last used (descending)
      if (a.last_used && b.last_used) {
        return new Date(b.last_used).getTime() - new Date(a.last_used).getTime()
      }
      if (a.last_used && !b.last_used) return -1
      if (!a.last_used && b.last_used) return 1
      
      // Finally by name (ascending)
      return a.name.localeCompare(b.name)
    })
  ]

  // Filter items based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredItems(sortedItems.slice(0, 10)) // Show top 10 when empty
    } else {
      const filtered = sortedItems.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredItems(filtered.slice(0, 20)) // Show top 20 matches
    }
    setHighlightedIndex(-1)
  }, [value, sweets, products])

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom, // Use viewport coordinates for fixed positioning
        left: rect.left,
        width: rect.width
      })
    }
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    onChange(inputValue)
    if (!isOpen) {
      updateDropdownPosition()
    }
    setIsOpen(true)
  }

  // Handle item selection
  const handleItemSelect = (item: DropdownItem) => {
    onChange(item.name, item)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        updateDropdownPosition()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleItemSelect(filteredItems[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        // Check if click is inside the dropdown portal
        const dropdownElement = document.querySelector('[data-dropdown-portal]')
        if (!dropdownElement || !dropdownElement.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle scroll to update position
  useEffect(() => {
    const handleScrollOrResize = () => {
      updateDropdownPosition()
    }

    if (isOpen) {
      // Update position immediately when opened
      updateDropdownPosition()
      
      // Listen for scroll and resize events
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true)
        window.removeEventListener('resize', handleScrollOrResize)
      }
    }
  }, [isOpen, updateDropdownPosition])


  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          updateDropdownPosition()
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      
      {isOpen && createPortal(
        <div
          data-dropdown-portal
          style={{
            position: 'fixed',
            top: dropdownPosition.top + 1,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 9999,
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>
              No items found
            </div>
          ) : (
            filteredItems.map((item: DropdownItem, index: number) => {
                const isHighlighted = index === highlightedIndex
                const isProduct = !isSweet(item)
                
                return (
                  <div
                    key={`${isProduct ? 'product' : 'sweet'}-${item.id}`}
                    onClick={() => handleItemSelect(item)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      backgroundColor: isHighlighted ? '#f3f4f6' : 'white',
                      borderBottom: index < filteredItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div style={{ fontWeight: 500, color: '#111827' }}>
                      {item.name}
                      {isProduct && <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>(Master)</span>}
                    </div>
                  </div>
                )
              })
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
