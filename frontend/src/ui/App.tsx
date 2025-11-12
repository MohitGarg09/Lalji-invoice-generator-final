import React, { useEffect, useState } from 'react'
import CRM from './CRM'
import SweetDropdown from './SweetDropdown'

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

type InvoiceItemDraft = {
  sweetId?: number
  sweetName?: string
  mode?: 'weight' | 'count'
  gross_weight_kg?: string
  tray_weight_kg?: string
  count?: string
  unit_price_override?: string
  amount?: number
}

// Use environment variable for API base (e.g., https://your-backend.onrender.com/api)
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://127.0.0.1:8000/api'

export default function InvoiceApp() {
  const [currentPage, setCurrentPage] = useState<'invoice' | 'crm'>('invoice')
  const [crmRefreshTrigger, setCrmRefreshTrigger] = useState(0)
  
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('')
  const [billType, setBillType] = useState<'GST' | 'Non-GST'>('Non-GST')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('credit')
  const [discountPct, setDiscountPct] = useState('0')
  const [items, setItems] = useState<InvoiceItemDraft[]>([{}])
  const [creating, setCreating] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [dmNo, setDmNo] = useState('')
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
  // Load sweets from backend
  useEffect(() => {
    fetch(`${API_BASE}/sweets/`)
      .then((res) => res.json())
      .then((data: Sweet[] | { results?: Sweet[] }) => {
        setSweets(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(console.error)
  }, [])

  // Load products from backend
  useEffect(() => {
    fetch(`${API_BASE}/products/`)
      .then((res) => res.json())
      .then((data: any[] | { results?: any[] }) => {
        setProducts(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(console.error)
  }, [])

  // Update item and calculate amount
  const updateItem = (idx: number, patch: Partial<InvoiceItemDraft>) => {
    setItems((prev) => {
      const newItems = [...prev]
      const item = { ...newItems[idx], ...patch }
      // Find the item in either sweets or products
      const sweet = sweets.find((s) => s.id === item.sweetId)
      const product = products.find((p) => p.id === item.sweetId)
      const foundItem = sweet || product
      const mode = item.mode || (sweet ? sweet.sweet_type : product?.product_type)

      let unitPrice =
        item.unit_price_override && item.unit_price_override !== ''
          ? parseFloat(item.unit_price_override)
          : mode === 'weight'
          ? parseFloat(foundItem?.price_per_kg || '0')
          : parseFloat(foundItem?.price_per_unit || '0')

      if (mode === 'weight') {
        const gross = parseFloat(item.gross_weight_kg || '0')
        const tray = parseFloat(item.tray_weight_kg || '0')
        const netKg = Math.max(gross - tray, 0)
        item.amount = netKg * unitPrice
      } else if (mode === 'count') {
        const count = parseFloat(item.count || '0')
        item.amount = count * unitPrice
      } else {
        item.amount = 0
      }

      newItems[idx] = item
      return newItems
    })
  }

  const addRow = () => setItems((prev) => [...prev, {}])
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((sum, x) => sum + (x.amount || 0), 0)
  const discount =
    subtotal *
    (Math.min(Math.max(parseFloat(discountPct || '0'), 0), 100) / 100)
  const gstEnabled = billType === 'GST'
  const sgst = gstEnabled ? (subtotal - discount) * 0.025 : 0
  const cgst = gstEnabled ? (subtotal - discount) * 0.025 : 0
  const finalTotal = (subtotal - discount) + sgst + cgst
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
  } as React.CSSProperties

  // Create Invoice
  // async function createInvoice() {
  //   setCreating(true)
  //   try {
  //     // Step 1: Ensure all typed sweets exist
  //     for (let i = 0; i < items.length; i++) {
  //       const it = items[i]
  //       if (!it.sweetId && it.sweetName) {
  //         let existing = sweets.find(
  //           (s) => s.name.toLowerCase() === it.sweetName!.toLowerCase()
  //         )

  //         if (!existing) {
  //           const formData = new FormData()
  //           formData.append('name', it.sweetName!)
  //           formData.append('sweet_type', it.mode || 'weight')

  //           const res = await fetch(`${API_BASE}/sweets/`, {
  //             method: 'POST',
  //             body: formData,
  //           })

  //           if (!res.ok) throw new Error(`Failed to create sweet: ${await res.text()}`)
  //           existing = await res.json()
  //           setSweets((prev) => [...prev, existing!])
  //         }

  //         updateItem(i, { sweetId: existing.id })
  //       }
  //     }

  //     // Step 2: Prepare invoice payload
  //     const payload = {
  //       customer_name: customerName || undefined,
  //       discount_percent: discountPct || '0',
  //       payment_mode: paymentMode,
  //       bill_type: billType,
  //       items: items
  //         .filter((it) => it.sweetId)
  //         .map((it) => {
  //           const sweet = sweets.find((s) => s.id === it.sweetId)!
  //           const mode = it.mode || sweet.sweet_type
  //           if (mode === 'weight') {
  //             return {
  //               sweet: sweet.id,
  //               gross_weight_kg: it.gross_weight_kg?.toString() || '0',
  //               tray_weight_kg: it.tray_weight_kg?.toString() || '0',
  //               unit_price_override: it.unit_price_override || undefined,
  //             }
  //           }
  //           return {
  //             sweet: sweet.id,
  //             count: it.count || '0',
  //             unit_price_override: it.unit_price_override || undefined,
  //           }
  //         }),
  //     }

  //     // Step 3: Create invoice
  //     const res = await fetch(`${API_BASE}/invoices/`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     })

  //     if (!res.ok) throw new Error(await res.text())
  //     const data = await res.json()
  //     setCreatedId(data.id)
  //   } catch (e) {
  //     console.error(e)
  //     alert('Failed to create invoice: ' + e)
  //   } finally {
  //     setCreating(false)
  //   }
  // }

  async function createInvoice() {
    // Basic validation
    if (!customerName.trim()) {
      alert("Customer name is required");
      return;
    }
  
    if (!dmNo.trim()) {
      alert("DM No. is required");
      return;
    }
  
    if (items.length === 0 || !items.some(it => it.sweetName || it.sweetId)) {
      alert("Add at least one sweet to create invoice");
      return;
    }
  
    const discountValue = Math.min(Math.max(parseFloat(discountPct || '0'), 0), 100);
  
    setCreating(true);
    try {
      const updatedItems = [...items];
      // Use a local working list to include newly created sweets immediately
      const workingSweets: Sweet[] = [...sweets];
  
      // Step 1: Ensure all typed sweets exist
      for (let i = 0; i < updatedItems.length; i++) {
        const it = updatedItems[i];
        if (!it.sweetId && it.sweetName?.trim()) {
          let existing = workingSweets.find(
            (s) => s.name.toLowerCase() === it.sweetName!.toLowerCase()
          );
  
          if (!existing) {
            // Create new sweet
            const res = await fetch(`${API_BASE}/sweets/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: it.sweetName!.trim(),
                sweet_type: it.mode || "weight",
              }),
            });
  
            if (!res.ok) {
              throw new Error(`Failed to create sweet: ${await res.text()}`);
            }
  
            const newSweet = await res.json();
            if (newSweet) {
              existing = newSweet;
              // Update local working list immediately for subsequent lookups
              workingSweets.push(newSweet);
              // Update state (async) for UI consistency
              setSweets((prev) => [...prev, newSweet]);
            }
          }

          if (existing) {
            it.sweetId = existing.id;
            it.mode = it.mode || existing.sweet_type;
          } else {
            throw new Error(`Failed to find or create sweet: ${it.sweetName}`);
          }
        }
      }
  
      // Step 2: Calculate amounts safely
      updatedItems.forEach((it) => {
        const sweet = workingSweets.find((s) => s.id === it.sweetId);
        if (!sweet) return;
  
        const mode = it.mode || sweet.sweet_type;
        const unitPrice =
          it.unit_price_override && it.unit_price_override.trim() !== ""
            ? parseFloat(it.unit_price_override)
            : mode === "weight"
            ? parseFloat(sweet.price_per_kg || "0")
            : parseFloat(sweet.price_per_unit || "0");
  
        if (mode === "weight") {
          const gross = parseFloat((it.gross_weight_kg || "0").trim()) || 0;
          const tray = parseFloat((it.tray_weight_kg || "0").trim()) || 0;
          const netKg = Math.max(gross - tray, 0);
          it.amount = parseFloat((netKg * unitPrice).toFixed(2));
        } else {
          const count = parseFloat((it.count || "0").trim()) || 0;
          it.amount = parseFloat((count * unitPrice).toFixed(2));
        }
      });
  
      // Step 3: Prepare payload
      const payload = {
        customer_name: customerName.trim(),
        dm_no: dmNo.trim() || undefined,
        discount_percent: discountValue.toString(),
        payment_mode: paymentMode,
        bill_type: billType,
        items: updatedItems
          .filter((it) => it.sweetId)
          .map((it) => {
            const sweet = workingSweets.find((s) => s.id === it.sweetId)!;
            const mode = it.mode || sweet.sweet_type;
            if (mode === "weight") {
              return {
                sweet: sweet.id,
                gross_weight_kg: parseFloat(it.gross_weight_kg || "0"),
                tray_weight_kg: parseFloat(it.tray_weight_kg || "0"),
                unit_price_override: it.unit_price_override
                  ? parseFloat(it.unit_price_override)
                  : undefined,
              };
            }
            return {
              sweet: sweet.id,
              count: parseFloat(it.count || "0"),
              unit_price_override: it.unit_price_override
                ? parseFloat(it.unit_price_override)
                : undefined,
            };
          }),
      };
  
      // Step 4: Send invoice to backend
      const res = await fetch(`${API_BASE}/invoices/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) throw new Error(await res.text());
  
      const data = await res.json();
      setCreatedId(data.id);
      alert("Invoice created successfully!");
      
      // Trigger CRM refresh
      setCrmRefreshTrigger(prev => prev + 1);
      
      // Reset form after saving
      setCustomerName('');
      setDmNo('');
      setDiscountPct('0');
      setBillType('Non-GST');
      setPaymentMode('credit');
      setItems([{}]);
      setCreatedId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to create invoice: " + e);
    } finally {
      setCreating(false);
    }
  }

  // Fallback method to share PDF via WhatsApp (downloads PDF and opens WhatsApp)
  const shareViaWhatsAppFallback = async (
    pdfBlob: Blob,
    fileName: string
  ) => {
    // Download PDF first
    const downloadUrl = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
    
    // Open WhatsApp Web (user will select contact and attach file)
    // Open WhatsApp Web directly
    window.open('https://web.whatsapp.com', '_blank')
    
    // Show instruction
    alert('PDF downloaded successfully!\n\nWhatsApp Web is opening. Please:\n1. Select the contact\n2. Attach the downloaded PDF file from your downloads folder\n3. Send the message')
  }


  // Send invoice via WhatsApp
  async function sendViaWhatsApp() {
    setSendingWhatsApp(true)
    
    try {
      let invoiceId = createdId
      
      // If invoice is not created yet, create it first
      if (!invoiceId) {
        // Basic validation
        if (!customerName.trim()) {
          alert('Customer name is required')
          setSendingWhatsApp(false)
          return
        }
        
        if (!dmNo.trim()) {
          alert('DM No. is required')
          setSendingWhatsApp(false)
          return
        }
        
        if (items.length === 0 || !items.some(it => it.sweetName || it.sweetId)) {
          alert('Add at least one sweet to create invoice')
          setSendingWhatsApp(false)
          return
        }

        // Create invoice first (reuse createInvoice logic)
        setCreating(true)
        const discountValue = Math.min(Math.max(parseFloat(discountPct || '0'), 0), 100)
        
        const updatedItems = [...items]
        const workingSweets: Sweet[] = [...sweets]

        // Ensure all items have corresponding Sweet records
        for (let i = 0; i < updatedItems.length; i++) {
          const it = updatedItems[i]
          
          // If item has sweetId, check if it's a product that needs to be converted to sweet
          if (it.sweetId) {
            const sweet = workingSweets.find((s) => s.id === it.sweetId)
            const product = products.find((p) => p.id === it.sweetId)
            
            // If it's a product (not found in sweets), create a corresponding sweet
            if (!sweet && product) {
              const res = await fetch(`${API_BASE}/sweets/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: product.name,
                  sweet_type: product.product_type,
                  price_per_kg: product.price_per_kg,
                  price_per_unit: product.price_per_unit,
                }),
              })

              if (!res.ok) {
                throw new Error(`Failed to create sweet from product: ${await res.text()}`)
              }

              const newSweet = await res.json()
              if (newSweet) {
                workingSweets.push(newSweet)
                setSweets((prev) => [...prev, newSweet])
                // Update the item to use the new sweet ID
                it.sweetId = newSweet.id
                it.mode = it.mode || newSweet.sweet_type
              }
            }
          }
          // Handle manually typed sweet names
          else if (!it.sweetId && it.sweetName?.trim()) {
            let existing = workingSweets.find(
              (s) => s.name.toLowerCase() === it.sweetName!.toLowerCase()
            )

            if (!existing) {
              const res = await fetch(`${API_BASE}/sweets/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: it.sweetName!.trim(),
                  sweet_type: it.mode || "weight",
                }),
              })

              if (!res.ok) {
                throw new Error(`Failed to create sweet: ${await res.text()}`)
              }

              const newSweet = await res.json()
              if (newSweet) {
                existing = newSweet
                workingSweets.push(newSweet)
                setSweets((prev) => [...prev, newSweet])
              }
            }

            if (existing) {
              it.sweetId = existing.id
              it.mode = it.mode || existing.sweet_type
            }
          }
        }

        // Calculate amounts
        updatedItems.forEach((it) => {
          const sweet = workingSweets.find((s) => s.id === it.sweetId)
          if (!sweet) return

          const mode = it.mode || sweet.sweet_type
          const unitPrice =
            it.unit_price_override && it.unit_price_override.trim() !== ""
              ? parseFloat(it.unit_price_override)
              : mode === "weight"
              ? parseFloat(sweet.price_per_kg || "0")
              : parseFloat(sweet.price_per_unit || "0")

          if (mode === "weight") {
            const gross = parseFloat((it.gross_weight_kg || "0").trim()) || 0
            const tray = parseFloat((it.tray_weight_kg || "0").trim()) || 0
            const netKg = Math.max(gross - tray, 0)
            it.amount = parseFloat((netKg * unitPrice).toFixed(2))
          } else {
            const count = parseFloat((it.count || "0").trim()) || 0
            it.amount = parseFloat((count * unitPrice).toFixed(2))
          }
        })

        // Prepare payload
        const payload = {
          customer_name: customerName.trim(),
          dm_no: dmNo.trim() || undefined,
          discount_percent: discountValue.toString(),
          payment_mode: paymentMode,
          bill_type: billType,
          items: updatedItems
            .filter((it) => it.sweetId)
            .map((it) => {
              const sweet = workingSweets.find((s) => s.id === it.sweetId)
              
              if (!sweet) {
                throw new Error(`Sweet with ID ${it.sweetId} not found`)
              }
              
              const mode = it.mode || sweet.sweet_type
              if (mode === "weight") {
                return {
                  sweet: sweet.id,
                  gross_weight_kg: parseFloat(it.gross_weight_kg || "0"),
                  tray_weight_kg: parseFloat(it.tray_weight_kg || "0"),
                  unit_price_override: it.unit_price_override
                    ? parseFloat(it.unit_price_override)
                    : undefined,
                }
              }
              return {
                sweet: sweet.id,
                count: parseFloat(it.count || "0"),
                unit_price_override: it.unit_price_override
                  ? parseFloat(it.unit_price_override)
                  : undefined,
              }
            }),
        }

        // Send invoice to backend
        const res = await fetch(`${API_BASE}/invoices/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error(await res.text())

        const data = await res.json()
        invoiceId = data.id
        setCreatedId(data.id)
        setCreating(false)
      }

      // Fetch PDF as blob from the backend
      const pdfUrl = `${API_BASE}/invoices/${invoiceId}/pdf/`
      const pdfResponse = await fetch(pdfUrl)
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF')
      }
      
      const pdfBlob = await pdfResponse.blob()
      const pdfFile = new File([pdfBlob], `invoice_${invoiceId}.pdf`, { type: 'application/pdf' })
      
      // Create WhatsApp message
      const message = `Hello ${customerName.trim()},\n\nYour invoice #${invoiceId} has been generated. Please find the invoice PDF attached.\n\nThank you for your business!`
      
      // Try to use Web Share API (best experience on mobile devices)
      // Check if Web Share API is available
      if (navigator.share) {
        try {
          // Try to share with file - this will work on mobile devices
          await navigator.share({
            files: [pdfFile],
            title: `Invoice #${invoiceId} - ${customerName.trim()}`,
            text: message,
          })
          
          // Successfully shared via native share (WhatsApp will be an option on mobile)
          // No need to show alert if user successfully shared
        } catch (shareError: any) {
          // User cancelled share dialog
          if (shareError.name === 'AbortError') {
            // User cancelled, don't do anything
            setSendingWhatsApp(false)
            return
          }
          
          // Share failed (might not support files), use fallback
          console.warn('Web Share API failed, using fallback method:', shareError)
          await shareViaWhatsAppFallback(pdfBlob, pdfFile.name)
        }
      } else {
        // Web Share API not available, use fallback
        await shareViaWhatsAppFallback(pdfBlob, pdfFile.name)
      }
      
      // Trigger CRM refresh
      setCrmRefreshTrigger(prev => prev + 1)
      
      // Reset form after successful WhatsApp send
      setCustomerName('')
      setDmNo('')
      setDiscountPct('0')
      setBillType('Non-GST')
      setPaymentMode('credit')
      setItems([{}])
      setCreatedId(null)
      
    } catch (e) {
      console.error(e)
      alert('Failed to send via WhatsApp: ' + e)
    } finally {
      setSendingWhatsApp(false)
    }
  }

  // Show CRM if on CRM page
  if (currentPage === 'crm') {
    return (
      <CRM 
        onNavigateToInvoice={() => setCurrentPage('invoice')}
        refreshTrigger={crmRefreshTrigger}
      />
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
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
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>
              Invoice Generator
            </h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
              Create and manage your invoices efficiently
            </p>
          </div>
          <button
            onClick={() => setCurrentPage('crm')}
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
            View CRM
          </button>
        </div>

        <div style={{ padding: '40px' }}>
          {/* Customer Name */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Customer Name
            </label>
            <input
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                ...inputStyle,
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid #e5e7eb',
              }}
            />
          </div>

{/* Toggles Section */}
<div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
    gap: '40px',
  }}
>
  {/* Mode Toggle */}
  <div
    style={{
      flex: 1,
      backgroundColor: '#f9fafb',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      padding: '16px 20px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      transition: '0.2s ease',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '12px',
      }}
    >
      Mode
    </span>
    <div style={{ display: 'flex', gap: '24px' }}>
<label
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#374151',
    cursor: 'pointer',
    transition: '0.2s',
  }}
>
  <input
    type="radio"
    name="paymentMode"
    value="cash"
    checked={paymentMode === 'cash'}
    onChange={() => setPaymentMode('cash')}
    style={{
      accentColor: '#10b981',
      transform: 'scale(1.15)',
      cursor: 'pointer',
    }}
  />
  <span>Cash</span>
</label>

<label
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#374151',
    cursor: 'pointer',
    transition: '0.2s',
  }}
>
  <input
    type="radio"
    name="paymentMode"
    value="credit"
    checked={paymentMode === 'credit'}
    onChange={() => setPaymentMode('credit')}
    style={{
      accentColor: '#10b981',
      transform: 'scale(1.15)',
      cursor: 'pointer',
    }}
  />
  <span>Credit</span>
</label>

    </div>
  </div>

  {/* Bill Type Toggle */}
  <div
    style={{
      flex: 1,
      backgroundColor: '#f9fafb',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      padding: '16px 20px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      transition: '0.2s ease',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '12px',
      }}
    >
      Bill Type
    </span>
    <div style={{ display: 'flex', gap: '24px' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '15px',
          color: '#374151',
          cursor: 'pointer',
          transition: '0.2s',
        }}
      >
        <input
          type="radio"
          name="billType"
          checked={billType === 'GST'}
          onChange={() => setBillType('GST')}
          style={{
            accentColor: '#3b82f6',
            transform: 'scale(1.15)',
            cursor: 'pointer',
          }}
        />
        <span>GST</span>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '15px',
          color: '#374151',
          cursor: 'pointer',
          transition: '0.2s',
        }}
      >
        <input
          type="radio"
          name="billType"
          checked={billType === 'Non-GST'}
          onChange={() => setBillType('Non-GST')}
          style={{
            accentColor: '#3b82f6',
            transform: 'scale(1.15)',
            cursor: 'pointer',
          }}
        />
        <span>Non-GST</span>
      </label>
    </div>
  </div>
</div>

{/* DM No. Input Box */}
<div
  style={{
    flex: 1,
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px 40px 10px 20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: '0.2s ease',
  }}
>
  <label
    style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '12px',
    }}
  >
    DM No. *
  </label>
  <input
    type="text"
    placeholder="Enter DM number (required)"
    value={dmNo}
    onChange={(e) => setDmNo(e.target.value)}
    required
    style={{
      width: '100%',
      padding: '10px 14px',
      fontSize: '15px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: 'white',
      fontFamily: 'inherit',
    }}
  />
</div>

          {/* Spacing after DM No. */}
          <div style={{ marginBottom: '32px' }}></div>

          {/* Items Table */}
          <div
            style={{
              overflowX: 'auto',
              marginBottom: '24px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            }}
          >
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr style={{ background: 'linear-gradient(to right, #f9fafb, #f3f4f6)' }}>
                  <th style={{ textAlign: 'left', padding: '16px', width: '17%' }}>SWEET</th>
                  <th style={{ textAlign: 'left', padding: '16px', width: '9%' }}>MODE</th>
                  <th style={{ textAlign: 'left', padding: '16px', width: '8%' }}>GROSS (KG)</th>
                  <th style={{ textAlign: 'left', padding: '16px', width: '8%' }}>TRAY (KG)</th>
                  <th style={{ textAlign: 'left', padding: '16px', width: '7%' }}>NET (KG)</th>
                  <th style={{ textAlign: 'left', padding: '16px', width: '15%' }}>COUNT</th>
                  <th style={{ textAlign: 'right', padding: '16px', width: '14%' }}>UNIT PRICE</th>
                  <th style={{ textAlign: 'right', padding: '16px', width: '12%' }}>AMOUNT (₹)</th>
                  <th style={{ padding: '16px', width: '30px' }}></th>
                </tr>
              </thead>

              <tbody>
                {items.map((it, idx) => {
                  // Find the item in either sweets or products
                  const sweet = sweets.find((s) => s.id === it.sweetId)
                  const product = products.find((p) => p.id === it.sweetId)
                  const foundItem = sweet || product
                  const mode = it.mode || (sweet ? sweet.sweet_type : product?.product_type)
                  const amount = it.amount || 0

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ 
                        padding: '12px 16px', 
                        minWidth: '100px',
                        width: '17%'
                      }}>
                        <SweetDropdown
                          sweets={sweets}
                          products={products}
                          value={it.sweetName ?? foundItem?.name ?? ''}
                          onChange={(name, selectedItem) => {
                            // Handle both Sweet and ProductMaster items
                            const itemType = selectedItem ? 
                              ('sweet_type' in selectedItem ? selectedItem.sweet_type : selectedItem.product_type) : 
                              it.mode
                            const pricePerKg = selectedItem?.price_per_kg
                            const pricePerUnit = selectedItem?.price_per_unit
                            
                            updateItem(idx, {
                              sweetName: name,
                              sweetId: selectedItem?.id,
                              mode: selectedItem ? it.mode ?? itemType : it.mode,
                              // Auto-fill unit price if available
                              unit_price_override: itemType === 'weight' ? pricePerKg : pricePerUnit,
                            })
                          }}
                          placeholder="Type sweet name"
                          style={inputStyle}
                        />
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                            }}
                          >
                            <input
                              type="radio"
                              name={`mode-${idx}`}
                              checked={mode === 'weight'}
                              onChange={() => updateItem(idx, { mode: 'weight', count: '' })}
                            />
                            Weight
                          </label>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                            }}
                          >
                            <input
                              type="radio"
                              name={`mode-${idx}`}
                              checked={mode === 'count'}
                              onChange={() => updateItem(idx, { mode: 'count', gross_weight_kg: '', tray_weight_kg: '' })}
                            />
                            Count
                          </label>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={it.gross_weight_kg ?? ''}
                          onChange={(e) =>
                            updateItem(idx, { gross_weight_kg: e.target.value })
                          }
                          disabled={mode !== 'weight'}
                          style={{
                            ...inputStyle,
                            background: mode !== 'weight' ? '#f9fafb' : 'white',
                          }}
                        />
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={it.tray_weight_kg ?? ''}
                          onChange={(e) =>
                            updateItem(idx, { tray_weight_kg: e.target.value })
                          }
                          disabled={mode !== 'weight'}
                          style={{
                            ...inputStyle,
                            background: mode !== 'weight' ? '#f9fafb' : 'white',
                          }}
                        />
                      </td>

                      {/* Net (KG) - computed */}
                      <td style={{ padding: '12px 16px', color: '#374151' }}>
                        {(() => {
                          const gross = parseFloat(it.gross_weight_kg || '0')
                          const tray = parseFloat(it.tray_weight_kg || '0')
                          const net = Math.max((isNaN(gross) ? 0 : gross) - (isNaN(tray) ? 0 : tray), 0)
                          return mode === 'weight' ? net.toFixed(3) : '-'
                        })()}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <input
                          type="number"
                          value={it.count ?? ''}
                          onChange={(e) => updateItem(idx, { count: e.target.value })}
                          disabled={mode !== 'count'}
                          style={{
                            ...inputStyle,
                            width: '75%',
                            background: mode !== 'count' ? '#f9fafb' : 'white',
                          }}
                        />
                      </td>

                      <td style={{ padding: '12px 4px 12px 16px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            width: '100%',
                          }}
                        >
                          <input
                            style={{
                              ...inputStyle,
                              width: '70px',
                              textAlign: 'right',
                            }}
                            type="number"
                            step="0.01"
                            placeholder={mode === 'weight' ? 'per kg' : 'per pc'}
                            value={it.unit_price_override ?? ''}
                            onChange={(e) =>
                              updateItem(idx, { unit_price_override: e.target.value })
                            }
                          />
                          <span
                            style={{
                              color: '#9ca3af',
                              fontSize: '13px',
                              minWidth: '40px',
                            }}
                          >
                            {mode === 'weight' ? '/ kg' : '/ pc'}
                          </span>
                        </div>
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          padding: '12px 16px',
                          fontWeight: 600,
                          fontSize: '15px',
                          color: '#374151',
                        }}
                      >
                        {amount.toFixed(2)}
                      </td>

                      <td style={{ padding: '4px', textAlign: 'center', position: 'relative' }}>
                        <button
                          onClick={() => removeRow(idx)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '1px solid #dc2626',
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0',
                          }}
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}
          >
            + Add Item
          </button>

          {/* Summary Section */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                minWidth: '400px',
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <span style={{ color: '#6b7280', fontWeight: 500 }}>Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  ₹ {subtotal.toFixed(2)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '2px solid #e5e7eb',
                }}
              >
                <span style={{ color: '#6b7280', fontWeight: 500 }}>Discount:</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    style={{
                      width: '80px',
                      padding: '8px 12px',
                      fontSize: '15px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      textAlign: 'right',
                      outline: 'none',
                    }}
                  />
                  
                  <span
                    style={{
                      color: '#6b7280',
                      fontWeight: 500,
                      minWidth: '100px',
                    }}
                  >
                    % (₹ {discount.toFixed(2)})
                  </span>
                </div>
              </div>
{/* GST Section (only visible if Bill Type is GST) */}
{gstEnabled && (
  <div
    style={{
      marginBottom: '16px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e5e7eb',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ color: '#6b7280', fontWeight: 500 }}>SGST (2.5%):</span>
      <span style={{ fontWeight: 600, color: '#374151' }}>₹ {sgst.toFixed(2)}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#6b7280', fontWeight: 500 }}>CGST (2.5%):</span>
      <span style={{ fontWeight: 600, color: '#374151' }}>₹ {cgst.toFixed(2)}</span>
    </div>
  </div>
)}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '20px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#1f2937' }}>Total:</span>
                <span style={{ fontWeight: 700, color: '#667eea' }}>
                  ₹ {finalTotal.toFixed(2)}
                </span>
              </div>
              
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <button
              disabled={creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)}
              onClick={createInvoice}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                background: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {creating ? 'Creating...' : 'Create Invoice'}
            </button>

            <button
              disabled={creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)}
              onClick={sendViaWhatsApp}
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                background: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              title="Create invoice and send via WhatsApp"
            >
              {sendingWhatsApp ? (
                <>Creating & Sending...</>
              ) : (
                <>
                  <span>📱</span>
                  <span>Create Invoice and Send via WhatsApp</span>
                </>
              )}
            </button>
          </div>

          {/* Footer with Developer Credits */}
          <div
            style={{
              marginTop: '60px',
              paddingTop: '32px',
              borderTop: '2px solid #e5e7eb',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: '1.8',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                Made with ❤️ by <strong style={{ color: '#374151' }}>Mohit Garg</strong>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  © {new Date().getFullYear()} Lalji Invoice Generator. All rights reserved by Lalji Caterers.
                </div>
                <div style={{ marginBottom: '4px' }}>
                  This software is proprietary and confidential.
                </div>
                <div>
                  Unauthorized copying, distribution, or use is strictly prohibited.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
