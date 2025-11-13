import React, { useEffect, useState } from 'react'
import SweetDropdown from './SweetDropdown'

type InvoiceItem = {
  id: number
  sweet?: number
  sweet_name?: string
  item_type: 'weight' | 'count'
  gross_weight_kg?: string
  tray_weight_kg?: string
  net_weight_kg?: string
  count?: number
  unit_price_override?: string
  total_amount: string
}

type Invoice = {
  id: number
  created_at: string
  customer_name: string
  discount_percent: string
  subtotal: string
  dm_no?: string
  payment_mode: 'cash' | 'credit'
  bill_type: 'GST' | 'Non-GST'
  total: string
  gst_amount: string
  total_with_gst: string
  items: InvoiceItem[]
}

// Use environment variable for API base (e.g., https://your-backend.onrender.com/api)
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://127.0.0.1:8000/api'

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

type CRMProps = {
  onNavigateToInvoice: () => void
  refreshTrigger?: number
}

export default function CRM({ onNavigateToInvoice, refreshTrigger = 0 }: CRMProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  // Report state
  const [reportVisible, setReportVisible] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportInvoices, setReportInvoices] = useState<Invoice[]>([])

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Products Management state
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    product_type: 'weight' as 'weight' | 'count',
    price_per_kg: '',
    price_per_unit: '',
    is_active: true
  })

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterBillType, setFilterBillType] = useState<string>('')
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<string>('-created_at')

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterCustomer) params.append('customer_name', filterCustomer)
      if (filterBillType) params.append('bill_type', filterBillType)
      if (filterPaymentMode) params.append('payment_mode', filterPaymentMode)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (sortBy) params.append('ordering', sortBy)

      const response = await fetch(`${API_BASE}/invoices/search/?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')
      const data = await response.json()
      setInvoices(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      alert('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [searchTerm, filterCustomer, filterBillType, filterPaymentMode, dateFrom, dateTo, sortBy, refreshTrigger])

  // Load sweets once for edit modal selections
  useEffect(() => {
    fetch(`${API_BASE}/sweets/`)
      .then((r) => r.json())
      .then((data: Sweet[] | { results?: Sweet[] }) => {
        setSweets(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => {})
  }, [])

  // Load products once for dropdown selections
  useEffect(() => {
    loadProducts()
  }, [])

  // Verify admin password
  const handleAdminLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/invoices/verify_admin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const data = await response.json()
      if (data.success) {
        setIsAdmin(true)
        setShowPasswordModal(false)
        setAdminPassword('')
      } else {
        alert('Invalid password')
      }
    } catch (error) {
      console.error('Error verifying admin:', error)
      alert('Failed to verify admin password')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `₹ ${num.toFixed(2)}`
  }

  // Reset dropdown usage statistics
  const handleResetDropdownData = async () => {
    if (!resetPassword.trim()) {
      alert('Please enter admin password')
      return
    }

    // Confirmation for reset action
    const confirmed = window.confirm(
      'This will clear all sweet names from the dropdown.\n\n' +
      'After reset:\n' +
      '• Dropdown will be empty\n' +
      '• Your existing invoices will keep their sweet names\n' +
      '• You can start fresh by adding new sweet names\n\n' +
      'Continue with clearing dropdown?'
    )
    if (!confirmed) return

    setResetting(true)
    try {
      const response = await fetch(`${API_BASE}/sweets/reset_usage_stats/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Success! ${data.message}`)
        setResetPassword('')
        setShowSettings(false)
        // Clear sweets data since all sweet records are deleted
        setSweets([])
        // Signal to other components that sweets were cleared
        localStorage.setItem('sweetsCleared', Date.now().toString())
        // Also trigger a page reload to ensure all components refresh
        window.location.reload()
      } else {
        alert(data.message || 'Failed to clear sweet names')
      }
    } catch (error) {
      console.error('Error resetting usage statistics:', error)
      alert('Error resetting usage statistics')
    } finally {
      setResetting(false)
    }
  }

  // Load products from backend
  const loadProducts = async () => {
    try {
      const url = `${API_BASE}/products/`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to load products: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Save product (create or update)
  const saveProduct = async () => {
    // Basic validation
    if (!productForm.name.trim()) {
      alert('Product name is required')
      return
    }
    
    if (!productForm.price_per_kg.trim() && !productForm.price_per_unit.trim()) {
      alert('At least one price (per kg or per unit) is required')
      return
    }
    
    try {
      let url, method
      
      if (editingProduct) {
        url = `${API_BASE}/products/${editingProduct.id}/`
        method = 'PUT'
      } else {
        url = `${API_BASE}/products/`
        method = 'POST'
      }
      
      console.log('Saving product:', { url, method, productForm, editingProduct: editingProduct?.id })
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!')
        loadProducts()
        resetProductForm()
      } else {
        const error = await response.text()
        console.error('Error response:', error)
        
        if (error.includes('No ProductMaster matches the given query')) {
          alert('Product not found. It may have been deleted. Refreshing the product list...')
          loadProducts()
          resetProductForm()
        } else {
          alert(`Error: ${error || 'Failed to save product'}`)
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product')
    }
  }

  // Delete product
  const deleteProduct = async (productId: number) => {
    // Verify product exists before deleting
    const existingProduct = products.find(p => p.id === productId)
    if (!existingProduct) {
      alert('Product not found. Please refresh the page and try again.')
      loadProducts() // Refresh product list
      return
    }
    
    if (!confirm(`Are you sure you want to delete "${existingProduct.name}"?`)) return
    
    try {
      const url = `${API_BASE}/products/${productId}/`
      console.log('Deleting product:', { url, productId, productName: existingProduct.name })
      
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log('Delete response status:', response.status)
      
      if (response.ok) {
        alert('Product deleted successfully!')
        loadProducts()
      } else {
        const error = await response.text()
        console.error('Delete error response:', error)
        
        if (error.includes('No ProductMaster matches the given query')) {
          alert('Product was already deleted or not found. Refreshing the list...')
          loadProducts()
        } else {
          alert(`Error deleting product: ${error}`)
        }
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product')
    }
  }

  // Reset product form
  const resetProductForm = () => {
    setProductForm({
      name: '',
      product_type: 'weight',
      price_per_kg: '',
      price_per_unit: '',
      is_active: true
    })
    setEditingProduct(null)
  }

  // Edit product
  const editProduct = (product: any) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      product_type: product.product_type,
      price_per_kg: product.price_per_kg || '',
      price_per_unit: product.price_per_unit || '',
      is_active: true
    })
  }

  // Download PDF
  const downloadPDF = (invoiceId: number) => {
    window.open(`${API_BASE}/invoices/${invoiceId}/pdf/`, '_blank')
  }

  // Fetch all pages helper for report
  const fetchAllInvoices = async (baseParams: URLSearchParams): Promise<Invoice[]> => {
    const all: Invoice[] = []
    let page = 1
    while (true) {
      const params = new URLSearchParams(baseParams)
      params.append('page', String(page))
      const res = await fetch(`${API_BASE}/invoices/search/?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch report data')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Not paginated
        return data as Invoice[]
      } else {
        const results = (data.results || []) as Invoice[]
        all.push(...results)
        if (!data.next || results.length === 0) break
        page += 1
      }
    }
    return all
  }

  // Generate report from current filters
  const generateReport = async () => {
    setReportVisible(true)
    setReportLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterCustomer) params.append('customer_name', filterCustomer)
      if (filterBillType) params.append('bill_type', filterBillType)
      if (filterPaymentMode) params.append('payment_mode', filterPaymentMode)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (sortBy) params.append('ordering', sortBy)
      const all = await fetchAllInvoices(params)
      setReportInvoices(all)
    } catch (e) {
      console.error(e)
      alert('Failed to generate report')
    } finally {
      setReportLoading(false)
    }
  }

  // Print report (print only report section)
  const printReport = () => {
    const reportEl = document.getElementById('report-content')
    if (!reportEl) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!doctype html><html><head><title>Invoice Report</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; }
        h2 { margin: 0 0 12px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        thead th { background: #f3f4f6; text-align: left; }
        tfoot td { font-weight: 700; }
      </style>
    </head><body>`)
    printWindow.document.write(reportEl.innerHTML)
    printWindow.document.write('</body></html>')
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  // Delete invoice
  const handleDelete = async (invoiceId: number) => {
    if (!window.confirm(`Are you sure you want to delete invoice #${invoiceId}? This action cannot be undone.`)) {
      return
    }
    
    try {
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}/`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice')
      }
      
      alert('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  // Update invoice
  const handleUpdate = async (invoice: Invoice) => {
    try {
      // Enhanced validation: check each item thoroughly
      const invalidItems: number[] = []
      
      for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i]
        
        // Check if item has a sweet selected
        if (!item.sweet || typeof item.sweet !== 'number' || item.sweet <= 0) {
          invalidItems.push(i + 1)
          continue
        }
        
        // Check if the sweet still exists in our current data
        const sweetExists = sweets.some(s => s.id === item.sweet)
        const productExists = products.some(p => p.id === item.sweet)
        
        if (!sweetExists && !productExists) {
          invalidItems.push(i + 1)
        }
      }
      
      if (invalidItems.length > 0) {
        alert(`Please select valid sweets/products for items: ${invalidItems.join(', ')}.\n\nSome items may reference deleted products. Please reselect them from the dropdown.`)
        return
      }

      const payload = {
        customer_name: invoice.customer_name,
        dm_no: invoice.dm_no || '',
        discount_percent: invoice.discount_percent,
        payment_mode: invoice.payment_mode,
        bill_type: invoice.bill_type,
        items: invoice.items.map(item => ({
          sweet: item.sweet,
          item_type: item.item_type,
          gross_weight_kg: item.gross_weight_kg ? parseFloat(item.gross_weight_kg) : undefined,
          tray_weight_kg: item.tray_weight_kg ? parseFloat(item.tray_weight_kg) : undefined,
          count: item.count,
          unit_price_override: item.unit_price_override ? parseFloat(item.unit_price_override) : undefined,
        })),
      }

      const response = await fetch(`${API_BASE}/invoices/${invoice.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Update invoice error response:', errorText)
        
        // Try to parse the error and provide helpful feedback
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.items) {
            let errorMessage = 'Invoice update failed:\n\n'
            errorData.items.forEach((itemError: any, index: number) => {
              if (itemError.sweet && itemError.sweet.length > 0) {
                errorMessage += `Item ${index + 1}: ${itemError.sweet[0]}\n`
              }
            })
            errorMessage += '\nPlease reselect the products/sweets for the affected items.'
            throw new Error(errorMessage)
          }
        } catch (parseError) {
          // If parsing fails, use the original error
        }
        
        throw new Error(errorText || 'Failed to update invoice')
      }

      alert('Invoice updated successfully')
      fetchInvoices()
      setEditingInvoice(null)
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('Failed to update invoice: ' + error)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px 40px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>Invoice CRM</h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
              Search, filter, and manage all invoices
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onNavigateToInvoice}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Create Invoice
            </button>
            {!isAdmin && (
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  padding: '12px 24px',
                  fontSize: '15px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Admin Login
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setShowProductsModal(true)
                    loadProducts()
                  }}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginRight: '12px',
                  }}
                >
                  Manage Products
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Settings
                </button>
                <button
                  onClick={() => setIsAdmin(false)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    background: 'rgba(239, 68, 68, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Logout Admin
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div style={{ padding: '24px 40px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Search */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Invoice ID, Customer, DM No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Customer Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Customer
              </label>
              <input
                type="text"
                placeholder="Filter by customer..."
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Bill Type Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Bill Type
              </label>
              <select
                value={filterBillType}
                onChange={(e) => setFilterBillType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  background: 'white',
                }}
              >
                <option value="">All</option>
                <option value="GST">GST</option>
                <option value="Non-GST">Non-GST</option>
              </select>
            </div>

            {/* Payment Mode Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Payment Mode
              </label>
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  background: 'white',
                }}
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Sort By */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  background: 'white',
                }}
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="customer_name">Customer A-Z</option>
                <option value="-customer_name">Customer Z-A</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterCustomer('')
              setFilterBillType('')
              setFilterPaymentMode('')
              setDateFrom('')
              setDateTo('')
              setSortBy('-created_at')
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              fontSize: '14px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Clear All Filters
          </button>

          {/* Report Actions */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <button
              onClick={generateReport}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Generate Report (Date Range)
            </button>
            {reportVisible && (
              <button
                onClick={printReport}
                disabled={reportLoading || reportInvoices.length === 0}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  background: reportLoading || reportInvoices.length === 0 ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: reportLoading || reportInvoices.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Print Report
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '40px', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No invoices found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Invoice ID</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>DM No</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Bill Type</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Payment</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Subtotal</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Discount</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>GST</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Total</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#374151', fontWeight: 600 }}>#{invoice.id}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{formatDate(invoice.created_at)}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#374151' }}>{invoice.customer_name || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{invoice.dm_no || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: invoice.bill_type === 'GST' ? '#dbeafe' : '#fef3c7',
                          color: invoice.bill_type === 'GST' ? '#1e40af' : '#92400e',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {invoice.bill_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{invoice.payment_mode?.toUpperCase() || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>
                      {formatCurrency(invoice.subtotal)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                      {parseFloat(invoice.discount_percent || '0') > 0 ? `${invoice.discount_percent}%` : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                      {invoice.bill_type === 'GST' ? formatCurrency(invoice.gst_amount) : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#374151', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(invoice.total_with_gst)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => downloadPDF(invoice.id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                        >
                          PDF
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditingInvoice(invoice)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowPasswordModal(false)}
          >
            <div
              style={{
                background: 'white',
                padding: '32px',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}>Admin Login</h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                Enter admin password to enable editing
              </p>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280',
                  padding: '4px',
                }}
              >
                {showAdminPassword ? '🙈' : '👁️'}
              </button>
            </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setAdminPassword('')
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminLogin}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Invoice Modal */}
        {editingInvoice && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              overflowY: 'auto',
              padding: '20px',
            }}
            onClick={() => setEditingInvoice(null)}
          >
            <div
              style={{
                background: 'white',
                padding: '32px',
                borderRadius: '12px',
                maxWidth: '1100px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600 }}>Edit Invoice #{editingInvoice.id}</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={editingInvoice.customer_name}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, customer_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  DM No
                </label>
                <input
                  type="text"
                  value={editingInvoice.dm_no || ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, dm_no: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Discount %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editingInvoice.discount_percent}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, discount_percent: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Bill Type
                </label>
                <select
                  value={editingInvoice.bill_type}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, bill_type: e.target.value as 'GST' | 'Non-GST' })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    background: 'white',
                  }}
                >
                  <option value="GST">GST</option>
                  <option value="Non-GST">Non-GST</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Payment Mode
                </label>
                <select
                  value={editingInvoice.payment_mode}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, payment_mode: e.target.value as 'cash' | 'credit' })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    background: 'white',
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              {/* Items Editor */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                  Items
                </label>

                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Sweet</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Mode</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Gross (kg)</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Tray (kg)</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Net (kg)</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Count</th>
                        <th style={{ textAlign: 'right', padding: '10px' }}>Unit Price</th>
                        <th style={{ textAlign: 'center', padding: '10px', width: '60px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingInvoice.items.map((it, idx) => {
                        const selectedSweet = sweets.find((s) => s.id === it.sweet)
                        const mode = it.item_type || selectedSweet?.sweet_type || 'weight'
                        const inputStyle: React.CSSProperties = {
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '13px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          outline: 'none',
                        }

                        const updateItem = (patch: Partial<InvoiceItem>) => {
                          const newItems = [...editingInvoice.items]
                          newItems[idx] = { ...newItems[idx], ...patch }
                          setEditingInvoice({ ...editingInvoice, items: newItems })
                        }

                        return (
                          <tr key={idx} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <SweetDropdown
                                sweets={sweets}
                                products={products}
                                value={it.sweet_name || selectedSweet?.name || ''}
                                onChange={(value, item) => {
                                  if (item) {
                                    // Determine item type and prices
                                    const itemType = 'sweet_type' in item ? item.sweet_type : item.product_type
                                    const pricePerKg = item.price_per_kg
                                    const pricePerUnit = item.price_per_unit
                                    
                                    updateItem({ 
                                      sweet: item.id, 
                                      sweet_name: item.name, 
                                      item_type: itemType,
                                      // Auto-fill unit price based on item type
                                      unit_price_override: itemType === 'weight' ? pricePerKg : pricePerUnit
                                    })
                                  } else {
                                    updateItem({ sweet: undefined, sweet_name: value })
                                  }
                                }}
                                placeholder="Select sweet or product"
                                style={inputStyle}
                              />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input
                                    type="radio"
                                    name={`edit-mode-${idx}`}
                                    checked={mode === 'weight'}
                                    onChange={() => updateItem({ item_type: 'weight', count: undefined })}
                                  />
                                  Weight
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input
                                    type="radio"
                                    name={`edit-mode-${idx}`}
                                    checked={mode === 'count'}
                                    onChange={() => updateItem({ item_type: 'count', gross_weight_kg: undefined, tray_weight_kg: undefined })}
                                  />
                                  Count
                                </label>
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={it.gross_weight_kg ?? ''}
                                onChange={(e) => updateItem({ gross_weight_kg: e.target.value })}
                                disabled={mode !== 'weight'}
                                style={{
                                  ...inputStyle,
                                  background: mode !== 'weight' ? '#f9fafb' : 'white',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={it.tray_weight_kg ?? ''}
                                onChange={(e) => updateItem({ tray_weight_kg: e.target.value })}
                                disabled={mode !== 'weight'}
                                style={{
                                  ...inputStyle,
                                  background: mode !== 'weight' ? '#f9fafb' : 'white',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', color: '#374151' }}>
                              {(() => {
                                const gross = parseFloat(it.gross_weight_kg || '0')
                                const tray = parseFloat(it.tray_weight_kg || '0')
                                const net = Math.max((isNaN(gross) ? 0 : gross) - (isNaN(tray) ? 0 : tray), 0)
                                return mode === 'weight' ? net.toFixed(3) : '-'
                              })()}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="number"
                                placeholder="0"
                                value={it.count ?? ''}
                                onChange={(e) => updateItem({ count: e.target.value === '' ? undefined : Number(e.target.value) })}
                                disabled={mode !== 'count'}
                                style={{
                                  ...inputStyle,
                                  background: mode !== 'count' ? '#f9fafb' : 'white',
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={mode === 'weight' ? 'per kg' : 'per pc'}
                                value={it.unit_price_override ?? ''}
                                onChange={(e) => updateItem({ unit_price_override: e.target.value })}
                                style={{ ...inputStyle, textAlign: 'right', width: 120 }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  const newItems = editingInvoice.items.filter((_, i) => i !== idx)
                                  setEditingInvoice({ ...editingInvoice, items: newItems })
                                }}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => {
                    const newItems: InvoiceItem[] = [...editingInvoice.items, {
                      id: Date.now(),
                      sweet: undefined,
                      sweet_name: '',
                      item_type: 'weight',
                      gross_weight_kg: '',
                      tray_weight_kg: '',
                      count: undefined,
                      unit_price_override: '',
                      total_amount: '0.00',
                    }]
                    setEditingInvoice({ ...editingInvoice, items: newItems })
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Add Item
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingInvoice(null)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdate(editingInvoice)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Section */}
        {reportVisible && (
          <div style={{ padding: '24px 40px' }}>
            <div id="report-content">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Invoice Report</h2>
              <p style={{ margin: '6px 0 16px 0', color: '#6b7280' }}>
                {dateFrom ? `From ${dateFrom}` : 'From start'} — {dateTo ? `To ${dateTo}` : 'To end'}
              </p>
              {reportLoading ? (
                <div style={{ padding: '20px', color: '#6b7280' }}>Generating report...</div>
              ) : reportInvoices.length === 0 ? (
                <div style={{ padding: '20px', color: '#6b7280' }}>No invoices in this range</div>
              ) : (
                (() => {
                  const totalSubtotal = reportInvoices.reduce((s, inv) => s + parseFloat(inv.subtotal || '0'), 0)
                  const totalGst = reportInvoices.reduce((s, inv) => s + parseFloat(inv.gst_amount || '0'), 0)
                  const totalFinal = reportInvoices.reduce((s, inv) => s + parseFloat(inv.total_with_gst || '0'), 0)
                  const totalDiscount = reportInvoices.reduce((s, inv) => s + (parseFloat(inv.subtotal || '0') * (Math.min(Math.max(parseFloat(inv.discount_percent || '0'), 0), 100) / 100)), 0)
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Invoice ID</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Customer</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>DM No</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Bill Type</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Payment</th>
                          <th style={{ textAlign: 'right', padding: '12px' }}>Subtotal</th>
                          <th style={{ textAlign: 'right', padding: '12px' }}>Discount</th>
                          <th style={{ textAlign: 'right', padding: '12px' }}>GST</th>
                          <th style={{ textAlign: 'right', padding: '12px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportInvoices.map((invoice) => (
                          <tr key={`report-${invoice.id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px' }}>#{invoice.id}</td>
                            <td style={{ padding: '12px' }}>{formatDate(invoice.created_at)}</td>
                            <td style={{ padding: '12px' }}>{invoice.customer_name || '-'}</td>
                            <td style={{ padding: '12px' }}>{invoice.dm_no || '-'}</td>
                            <td style={{ padding: '12px' }}>{invoice.bill_type}</td>
                            <td style={{ padding: '12px' }}>{invoice.payment_mode?.toUpperCase() || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹ {parseFloat(invoice.subtotal || '0').toFixed(2)}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹ {(parseFloat(invoice.subtotal || '0') * (Math.min(Math.max(parseFloat(invoice.discount_percent || '0'), 0), 100) / 100)).toFixed(2)}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹ {parseFloat(invoice.gst_amount || '0').toFixed(2)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(invoice.total_with_gst || '0').toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={6} style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>Totals:</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>₹ {totalSubtotal.toFixed(2)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>₹ {totalDiscount.toFixed(2)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>₹ {totalGst.toFixed(2)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>₹ {totalFinal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )
                })()
              )}
            </div>
          </div>
        )}

        {/* Products Management Modal */}
        {showProductsModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                  Manage Products
                </h2>
                <button
                  onClick={loadProducts}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a67d8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea'
                  }}
                >
                  🔄 Refresh Products
                </button>
              </div>
              
              {/* Product Form */}
              <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                      placeholder="Enter product name"
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Type
                    </label>
                    <select
                      value={productForm.product_type}
                      onChange={(e) => setProductForm({...productForm, product_type: e.target.value as 'weight' | 'count'})}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    >
                      <option value="weight">By Weight</option>
                      <option value="count">By Count</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Price per KG
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.price_per_kg}
                      onChange={(e) => setProductForm({...productForm, price_per_kg: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Price per Unit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.price_per_unit}
                      onChange={(e) => setProductForm({...productForm, price_per_unit: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={saveProduct}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  
                  {editingProduct && (
                    <button
                      onClick={resetProductForm}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
              
              {/* Products List */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
                  Products List
                </h3>
                
                {products.length === 0 ? (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No products found. Add your first product above.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Price/KG</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Price/Unit</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px', fontWeight: 500 }}>{product.name}</td>
                            <td style={{ padding: '12px' }}>{product.product_type === 'weight' ? 'By Weight' : 'By Count'}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹{product.price_per_kg || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹{product.price_per_unit || '-'}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button
                                onClick={() => editProduct(product)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  marginRight: '8px',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowProductsModal(false)
                    resetProductForm()
                  }}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                Settings
              </h2>
              
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
                  Dropdown Management
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                  Clear all sweet names from the dropdown to start fresh. Your existing invoices will keep their sweet names, but the dropdown will become empty so you can add new names.
                </p>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Admin Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Enter admin password"
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#6b7280',
                        padding: '4px',
                      }}
                    >
                      {showResetPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleResetDropdownData}
                  disabled={resetting}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: resetting ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: resetting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {resetting ? 'Clearing...' : 'Clear Dropdown Names'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowSettings(false)
                    setResetPassword('')
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

