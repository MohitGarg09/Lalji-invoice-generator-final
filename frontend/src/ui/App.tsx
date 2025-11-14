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

  // Helper function to check if an item is complete
  const isItemComplete = (item: InvoiceItemDraft): boolean => {
    if (!item.sweetName?.trim()) return false
    
    const mode = item.mode || 'weight'
    if (mode === 'weight') {
      return !!(item.gross_weight_kg?.trim() && item.tray_weight_kg?.trim())
    } else {
      return !!(item.count?.trim())
    }
  }


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
  
      // Step 1: Ensure all items have corresponding Sweet records
      for (let i = 0; i < updatedItems.length; i++) {
        const it = updatedItems[i];
        
        // Case 1: Item has sweetId - check if it's a product that needs conversion
        if (it.sweetId) {
          const sweet = workingSweets.find((s) => s.id === it.sweetId);
          const product = products.find((p) => p.id === it.sweetId);
          
          // Debug logging to track item resolution
          console.log(`Processing item ${i}: sweetId=${it.sweetId}, sweetName="${it.sweetName}"`);
          console.log(`Found sweet:`, sweet ? `${sweet.name} (ID: ${sweet.id})` : 'none');
          console.log(`Found product:`, product ? `${product.name} (ID: ${product.id})` : 'none');
          
          // If it's a product (not found in sweets), create a corresponding sweet
          if (!sweet && product) {
            // First check if a sweet with this name already exists
            const existingSweetByName = workingSweets.find(
              (s) => s.name.toLowerCase() === product.name.toLowerCase()
            );
            
            if (existingSweetByName) {
              // Use the existing sweet instead of creating a new one
              it.sweetId = existingSweetByName.id;
              it.mode = it.mode || existingSweetByName.sweet_type;
            } else {
              // Create new sweet from product
              const res = await fetch(`${API_BASE}/sweets/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: product.name,
                  sweet_type: product.product_type,
                  price_per_kg: product.price_per_kg,
                  price_per_unit: product.price_per_unit,
                }),
              });

              if (!res.ok) {
                const errorText = await res.text();
                // If sweet already exists, refresh sweets and try to find it
                if (errorText.includes("already exists")) {
                  // Refresh sweets from backend to get the latest data
                  try {
                    const sweetsRes = await fetch(`${API_BASE}/sweets/`);
                    if (sweetsRes.ok) {
                      const latestSweets = await sweetsRes.json();
                      setSweets(latestSweets);
                      // Update working sweets with latest data
                      const allSweets = [...workingSweets, ...latestSweets.filter(
                        (ls: Sweet) => !workingSweets.find(ws => ws.id === ls.id)
                      )];
                      
                      const existingSweet = allSweets.find(
                        (s) => s.name.toLowerCase() === product.name.toLowerCase()
                      );
                      if (existingSweet) {
                        it.sweetId = existingSweet.id;
                        it.mode = it.mode || existingSweet.sweet_type;
                        // Add to working sweets if not already there
                        if (!workingSweets.find(ws => ws.id === existingSweet.id)) {
                          workingSweets.push(existingSweet);
                        }
                      } else {
                        throw new Error(`Sweet "${product.name}" already exists but cannot be found even after refresh`);
                      }
                    } else {
                      throw new Error(`Sweet "${product.name}" already exists but cannot refresh sweets data`);
                    }
                  } catch (refreshError) {
                    throw new Error(`Sweet "${product.name}" already exists: ${refreshError}`);
                  }
                } else {
                  throw new Error(`Failed to create sweet from product: ${errorText}`);
                }
              } else {
                const newSweet = await res.json();
                if (newSweet) {
                  workingSweets.push(newSweet);
                  setSweets((prev) => [...prev, newSweet]);
                  // Update the item to use the new sweet ID
                  it.sweetId = newSweet.id;
                  it.mode = it.mode || newSweet.sweet_type;
                }
              }
            }
          } else if (!sweet && !product) {
            // Neither sweet nor product found - this shouldn't happen but let's handle it
            throw new Error(`Item with ID ${it.sweetId} not found in either sweets or products`);
          }
        }
        // Case 2: Item has sweetName but no sweetId - create new sweet
        else if (!it.sweetId && it.sweetName?.trim()) {
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
        if (!sweet) {
          console.warn(`Sweet with ID ${it.sweetId} not found in workingSweets during amount calculation`);
          return;
        }

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
            const sweet = workingSweets.find((s) => s.id === it.sweetId);
            
            if (!sweet) {
              throw new Error(`Sweet with ID ${it.sweetId} not found`);
            }
            
            // Debug logging to track what's being sent to backend
            console.log(`📤 Sending to backend - Row item:`, {
              originalName: it.sweetName,
              sweetId: it.sweetId,
              foundSweetName: sweet.name,
              foundSweetId: sweet.id
            });
            
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
              // First check if a sweet with this name already exists
              const existingSweetByName = workingSweets.find(
                (s) => s.name.toLowerCase() === product.name.toLowerCase()
              );
              
              if (existingSweetByName) {
                // Use the existing sweet instead of creating a new one
                it.sweetId = existingSweetByName.id;
                it.mode = it.mode || existingSweetByName.sweet_type;
              } else {
                // Create new sweet from product
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
                  const errorText = await res.text();
                  // If sweet already exists, refresh sweets and try to find it
                  if (errorText.includes("already exists")) {
                    // Refresh sweets from backend to get the latest data
                    try {
                      const sweetsRes = await fetch(`${API_BASE}/sweets/`);
                      if (sweetsRes.ok) {
                        const latestSweets = await sweetsRes.json();
                        setSweets(latestSweets);
                        // Update working sweets with latest data
                        const allSweets = [...workingSweets, ...latestSweets.filter(
                          (ls: Sweet) => !workingSweets.find(ws => ws.id === ls.id)
                        )];
                        
                        const existingSweet = allSweets.find(
                          (s) => s.name.toLowerCase() === product.name.toLowerCase()
                        );
                        if (existingSweet) {
                          it.sweetId = existingSweet.id;
                          it.mode = it.mode || existingSweet.sweet_type;
                          // Add to working sweets if not already there
                          if (!workingSweets.find(ws => ws.id === existingSweet.id)) {
                            workingSweets.push(existingSweet);
                          }
                        } else {
                          throw new Error(`Sweet "${product.name}" already exists but cannot be found even after refresh`);
                        }
                      } else {
                        throw new Error(`Sweet "${product.name}" already exists but cannot refresh sweets data`);
                      }
                    } catch (refreshError) {
                      throw new Error(`Sweet "${product.name}" already exists: ${refreshError}`);
                    }
                  } else {
                    throw new Error(`Failed to create sweet from product: ${errorText}`);
                  }
                } else {
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
            } else if (!sweet && !product) {
              // Neither sweet nor product found - this shouldn't happen but let's handle it
              throw new Error(`Item with ID ${it.sweetId} not found in either sweets or products`);
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
              const sweet = workingSweets.find((s) => s.id === it.sweetId);
              
              if (!sweet) {
                throw new Error(`Sweet with ID ${it.sweetId} not found`);
              }
              
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
    <>
      <style>{`
        * {
          scroll-behavior: smooth;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          scroll-behavior: smooth;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(197, 48, 48, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(197, 48, 48, 0.5);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-shimmer {
          background: linear-gradient(90deg, #C53030 25%, #E53E3E 50%, #C53030 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .card-hover {
          transition: all 0.2s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(197, 48, 48, 0.15);
        }
        
        .input-focus {
          transition: all 0.2s ease;
        }
        
        .input-focus:focus {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(197, 48, 48, 0.2);
          border-color: #C53030;
        }
        
        .button-hover {
          transition: all 0.2s ease;
        }
        
        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(197, 48, 48, 0.3);
        }
        
        .lalji-pattern {
          background-image: 
            radial-gradient(circle at 20% 20%, rgba(197, 48, 48, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(56, 161, 105, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(214, 158, 46, 0.04) 0%, transparent 50%);
        }
      `}</style>
      <div
        className="lalji-pattern"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        }}
      >
      <div
        className="card-hover"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'fadeInUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 50px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              animation: 'float 3s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '50%',
              animation: 'float 2.5s ease-in-out infinite 0.5s',
            }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1, flex: 1 }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '36px', 
                fontWeight: 800,
                letterSpacing: '-1px',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                Lalji Caterers
              </h1>
              <p style={{ 
                margin: '8px 0 0 0', 
                opacity: 0.95, 
                fontSize: '18px',
                fontWeight: 500,
                letterSpacing: '0.5px',
              }}>
                Professional Invoice Management
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setCurrentPage('crm')}
            className="button-hover"
            style={{
              padding: '16px 28px',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
              zIndex: 1,
            }}
          >
            📊 View CRM
          </button>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Customer Name */}
          <div className="card-hover" style={{ 
            marginBottom: '40px',
            background: 'rgba(255, 248, 240, 0.6)',
            padding: '30px',
            borderRadius: '20px',
            border: '1px solid rgba(197, 48, 48, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
          }}>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 700,
                color: '#C53030',
                marginBottom: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              👤 Customer Name
            </label>
            <input
              ref={(el) => {
                // Only focus on initial mount, not on every render
                if (el && !customerName && items.length === 1 && !items[0].sweetName) {
                  el.focus()
                }
              }}
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // Skip toggles and go directly to DM No
                  const dmNoInput = document.querySelector('input[placeholder="Enter DM number (required)"]') as HTMLElement
                  dmNoInput?.focus()
                }
              }}
              className="input-focus"
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '16px',
                border: '2px solid rgba(197, 48, 48, 0.3)',
                borderRadius: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                fontWeight: 500,
                boxSizing: 'border-box',
              }}
            />
          </div>

{/* Toggles Section */}
<div
  className="card-hover"
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '50px',
    gap: '30px',
    background: 'rgba(255, 248, 240, 0.4)',
    padding: '30px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 165, 0, 0.15)',
    animation: 'fadeInUp 0.6s ease-out 0.4s both',
  }}
>
  {/* Mode Toggle */}
  <div
    className="card-hover"
    style={{
      flex: 1,
      background: 'rgba(255, 255, 255, 0.8)',
      border: '2px solid rgba(197, 48, 48, 0.2)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(197, 48, 48, 0.1)',
      backdropFilter: 'blur(10px)',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '16px',
        fontWeight: 700,
        color: '#C53030',
        marginBottom: '16px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      💳 Payment Mode
    </span>
    <div style={{ display: 'flex', gap: '20px' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          color: '#333',
          cursor: 'pointer',
          fontWeight: 600,
          padding: '12px 16px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          background: paymentMode === 'cash' ? 'rgba(197, 48, 48, 0.1)' : 'transparent',
          border: paymentMode === 'cash' ? '2px solid rgba(255, 107, 53, 0.3)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (paymentMode !== 'cash') {
            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (paymentMode !== 'cash') {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <input
          type="radio"
          name="paymentMode"
          value="cash"
          checked={paymentMode === 'cash'}
          onChange={() => setPaymentMode('cash')}
          style={{
            accentColor: '#C53030',
            transform: 'scale(1.3)',
            cursor: 'pointer',
          }}
        />
        <span>💵 Cash</span>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          color: '#333',
          cursor: 'pointer',
          fontWeight: 600,
          padding: '12px 16px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          background: paymentMode === 'credit' ? 'rgba(197, 48, 48, 0.1)' : 'transparent',
          border: paymentMode === 'credit' ? '2px solid rgba(255, 107, 53, 0.3)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (paymentMode !== 'credit') {
            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (paymentMode !== 'credit') {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <input
          type="radio"
          name="paymentMode"
          value="credit"
          checked={paymentMode === 'credit'}
          onChange={() => setPaymentMode('credit')}
          style={{
            accentColor: '#C53030',
            transform: 'scale(1.3)',
            cursor: 'pointer',
          }}
        />
        <span>💳 Credit</span>
      </label>
    </div>
  </div>

  {/* Bill Type Toggle */}
  <div
    className="card-hover"
    style={{
      flex: 1,
      background: 'rgba(255, 255, 255, 0.8)',
      border: '2px solid rgba(197, 48, 48, 0.2)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(197, 48, 48, 0.1)',
      backdropFilter: 'blur(10px)',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '16px',
        fontWeight: 700,
        color: '#C53030',
        marginBottom: '16px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      📄 Bill Type
    </span>
    <div style={{ display: 'flex', gap: '20px' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          color: '#333',
          cursor: 'pointer',
          fontWeight: 600,
          padding: '12px 16px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          background: billType === 'GST' ? 'rgba(197, 48, 48, 0.1)' : 'transparent',
          border: billType === 'GST' ? '2px solid rgba(255, 107, 53, 0.3)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (billType !== 'GST') {
            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (billType !== 'GST') {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <input
          type="radio"
          name="billType"
          checked={billType === 'GST'}
          onChange={() => setBillType('GST')}
          style={{
            accentColor: '#C53030',
            transform: 'scale(1.3)',
            cursor: 'pointer',
          }}
        />
        <span>🏢 GST</span>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          color: '#333',
          cursor: 'pointer',
          fontWeight: 600,
          padding: '12px 16px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          background: billType === 'Non-GST' ? 'rgba(197, 48, 48, 0.1)' : 'transparent',
          border: billType === 'Non-GST' ? '2px solid rgba(255, 107, 53, 0.3)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (billType !== 'Non-GST') {
            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (billType !== 'Non-GST') {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <input
          type="radio"
          name="billType"
          checked={billType === 'Non-GST'}
          onChange={() => setBillType('Non-GST')}
          style={{
            accentColor: '#C53030',
            transform: 'scale(1.3)',
            cursor: 'pointer',
          }}
        />
        <span>📝 Non-GST</span>
      </label>
    </div>
  </div>
</div>

{/* DM No. Input Box */}
<div
  className="card-hover"
  style={{
    marginBottom: '50px',
    background: 'rgba(255, 248, 240, 0.6)',
    border: '2px solid rgba(197, 48, 48, 0.2)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 8px 25px rgba(197, 48, 48, 0.1)',
    backdropFilter: 'blur(10px)',
    animation: 'fadeInUp 0.6s ease-out 0.6s both',
  }}
>
  <label
    style={{
      display: 'block',
      fontSize: '16px',
      fontWeight: 700,
      color: '#C53030',
      marginBottom: '12px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    }}
  >
    📋 DM Number *
  </label>
  <input
    type="text"
    placeholder="Enter DM number (required)"
    value={dmNo}
    onChange={(e) => setDmNo(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Focus on first sweet input
        const firstSweetInput = document.querySelector('input[placeholder="Type sweet name"]') as HTMLElement
        firstSweetInput?.focus()
      }
    }}
    required
    className="input-focus"
    style={{
      width: '100%',
      padding: '16px 20px',
      fontSize: '16px',
      border: '2px solid rgba(255, 165, 0, 0.3)',
      borderRadius: '12px',
      outline: 'none',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      fontFamily: 'inherit',
      fontWeight: 500,
      boxSizing: 'border-box',
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
                  // Find the item - prioritize by name match first, then by ID
                  let foundItem = null
                  let sweet = null
                  let product = null
                  
                  if (it.sweetName && it.sweetName.trim()) {
                    // First try to find by name (more reliable)
                    sweet = sweets.find((s) => s.name.toLowerCase() === it.sweetName!.toLowerCase())
                    if (!sweet) {
                      product = products.find((p) => p.name.toLowerCase() === it.sweetName!.toLowerCase())
                    }
                    foundItem = sweet || product
                    
                    // Debug logging for display logic
                    console.log(`🖼️ Display logic for row ${idx}:`, {
                      storedSweetName: it.sweetName,
                      storedSweetId: it.sweetId,
                      foundItemName: foundItem?.name,
                      foundItemId: foundItem?.id,
                      foundItemType: foundItem ? ('sweet_type' in foundItem ? 'Sweet' : 'Product') : 'None'
                    });
                  }
                  
                  // If not found by name and we have sweetId, try by ID (but be careful about type)
                  if (!foundItem && it.sweetId) {
                    sweet = sweets.find((s) => s.id === it.sweetId)
                    if (!sweet) {
                      product = products.find((p) => p.id === it.sweetId)
                    }
                    foundItem = sweet || product
                  }
                  
                  const mode = it.mode || (sweet ? sweet.sweet_type : product?.product_type)
                  const amount = it.amount || 0

                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        animation: 'fadeInUp 0.3s ease-out',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
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
                            
                            // Debug logging to track what's being selected
                            if (selectedItem) {
                              const itemSource = 'sweet_type' in selectedItem ? 'Sweet' : 'Product'
                              console.log(`🔍 Item selected in row ${idx}:`, {
                                name: selectedItem.name,
                                id: selectedItem.id,
                                type: itemSource,
                                itemType: itemType
                              })
                            }
                            
                            updateItem(idx, {
                              sweetName: name,
                              sweetId: selectedItem?.id,
                              mode: selectedItem ? it.mode ?? itemType : it.mode,
                              // Auto-fill unit price if available
                              unit_price_override: itemType === 'weight' ? pricePerKg : pricePerUnit,
                            })
                            
                            // Auto-focus to appropriate input after selection
                            if (selectedItem) {
                              setTimeout(() => {
                                // Find the current row in the tbody (skip thead)
                                const tableRows = document.querySelectorAll('tbody tr')
                                const currentRow = tableRows[idx]
                                
                                if (itemType === 'weight') {
                                  // Focus on gross weight input (first input with placeholder "0.000")
                                  const grossInput = currentRow?.querySelector('input[step="0.001"][placeholder="0.000"]') as HTMLElement
                                  grossInput?.focus()
                                } else {
                                  // Focus on count input (input with type="number" but no step attribute)
                                  const countInput = currentRow?.querySelector('input[type="number"]:not([step])') as HTMLElement
                                  countInput?.focus()
                                }
                              }, 150)
                            }
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
                          onChange={(e) => {
                            updateItem(idx, { gross_weight_kg: e.target.value })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (mode === 'weight') {
                                // Focus on tray weight input (second input with step="0.001")
                                const currentRow = e.currentTarget.closest('tr')
                                const trayInput = currentRow?.querySelectorAll('input[step="0.001"]')[1] as HTMLElement
                                trayInput?.focus()
                              }
                            }
                          }}
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
                          onChange={(e) => {
                            updateItem(idx, { tray_weight_kg: e.target.value })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              // Check if item is complete and auto-add if it's the last row
                              const updatedItem = { ...it, tray_weight_kg: (e.target as HTMLInputElement).value }
                              if (isItemComplete(updatedItem) && idx === items.length - 1) {
                                setTimeout(() => {
                                  addRow()
                                  // Focus on the sweet input of the new row
                                  setTimeout(() => {
                                    const tableRows = document.querySelectorAll('tbody tr')
                                    const newRow = tableRows[idx + 1]
                                    const sweetInput = newRow?.querySelector('input[placeholder="Type sweet name"]') as HTMLElement
                                    sweetInput?.focus()
                                  }, 100)
                                }, 100)
                              }
                            }
                          }}
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
                          onChange={(e) => {
                            updateItem(idx, { count: e.target.value })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              // Check if item is complete and auto-add if it's the last row
                              const updatedItem = { ...it, count: (e.target as HTMLInputElement).value }
                              if (isItemComplete(updatedItem) && idx === items.length - 1) {
                                setTimeout(() => {
                                  addRow()
                                  // Focus on the sweet input of the new row
                                  setTimeout(() => {
                                    const tableRows = document.querySelectorAll('tbody tr')
                                    const newRow = tableRows[idx + 1]
                                    const sweetInput = newRow?.querySelector('input[placeholder="Type sweet name"]') as HTMLElement
                                    sweetInput?.focus()
                                  }, 100)
                                }, 100)
                              }
                            }
                          }}
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)'
              e.currentTarget.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
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
            className="card-hover"
            style={{
              marginTop: '50px',
              padding: '30px',
              background: 'rgba(255, 248, 240, 0.6)',
              borderRadius: '20px',
              border: '1px solid rgba(197, 48, 48, 0.2)',
              animation: 'fadeInUp 0.6s ease-out 1s both',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                disabled={creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)}
                onClick={createInvoice}
                className="button-hover"
                style={{
                  padding: '18px 40px',
                  fontSize: '17px',
                  background: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #C53030, #f7931e)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  boxShadow: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                    ? 'none'
                    : '0 8px 25px rgba(255, 107, 53, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: '200px',
                  justifyContent: 'center',
                }}
              >
                {creating ? (
                  <>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    Create Invoice
                  </>
                )}
              </button>

              <button
                disabled={creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)}
                onClick={sendViaWhatsApp}
                className="button-hover"
                style={{
                  padding: '18px 40px',
                  fontSize: '17px',
                  background: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #25d366, #128c7e)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  boxShadow: creating || sendingWhatsApp || !customerName.trim() || !dmNo.trim() || items.length === 0 || !items.some(it => it.sweetName || it.sweetId)
                    ? 'none'
                    : '0 8px 25px rgba(37, 211, 102, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: '280px',
                  justifyContent: 'center',
                }}
                title="Create invoice and send via WhatsApp"
              >
                {sendingWhatsApp ? (
                  <>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Creating & Sending...
                  </>
                ) : (
                  <>
                    <span>📱</span>
                    <span>Create & Send via WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer with Developer Credits */}
          <div
            style={{
              marginTop: '80px',
              padding: '40px 30px',
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(247, 147, 30, 0.05))',
              borderRadius: '20px',
              border: '1px solid rgba(255, 165, 0, 0.1)',
              textAlign: 'center',
              animation: 'fadeInUp 0.6s ease-out 1.2s both',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: '#666',
                lineHeight: '1.8',
              }}
            >
              <div style={{ 
                marginBottom: '16px',
                fontSize: '18px',
                fontWeight: 600,
              }}>
                Crafted with 🧡 by <strong style={{ 
                  color: '#C53030',
                  background: 'linear-gradient(135deg, #C53030, #f7931e)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>Mohit Garg</strong>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#888',
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '2px solid rgba(197, 48, 48, 0.2)',
                }}
              >
                <div style={{ 
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: '#C53030',
                }}>
                  🍽️ © {new Date().getFullYear()} Lalji Caterers Invoice System
                </div>
                <div style={{ marginBottom: '6px', fontSize: '13px' }}>
                  Professional Invoice Management Solution
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  Proprietary & Confidential • Unauthorized use prohibited
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
