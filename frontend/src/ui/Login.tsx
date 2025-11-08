import React, { useState } from 'react'

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || 'http://127.0.0.1:8000/api'

// Log API base URL for debugging (only in development or if localhost)
if (API_BASE.includes('127.0.0.1') || API_BASE.includes('localhost')) {
  console.warn('⚠️ Using localhost API URL. Make sure VITE_API_BASE is set in production!')
}
console.log('API Base URL:', API_BASE)

type LoginProps = {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Normalize password: trim whitespace and ensure it's a clean string
      const normalizedPassword = password.trim()
      
      if (!normalizedPassword) {
        setError('Please enter a password')
        setLoading(false)
        return
      }

      const apiUrl = `${API_BASE}/invoices/verify_access/`
      console.log('Attempting login request to:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ password: normalizedPassword }),
      })

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Invalid password'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Server error (${response.status})`
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        // Store authentication in sessionStorage
        sessionStorage.setItem('isAuthenticated', 'true')
        onLoginSuccess()
      } else {
        setError(data.message || 'Invalid password')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      console.error('API URL attempted:', `${API_BASE}/invoices/verify_access/`)
      
      // Check if using localhost in production
      const isLocalhost = API_BASE.includes('127.0.0.1') || API_BASE.includes('localhost')
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      
      // Provide more specific error messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        if (isLocalhost && isProduction) {
          setError('Configuration error: API URL not set. Please configure VITE_API_BASE environment variable.')
        } else {
          setError(`Cannot connect to server at ${API_BASE}. Please check your internet connection and server status.`)
        }
      } else if (error.message?.includes('CORS')) {
        setError('CORS error: Server configuration issue. Please contact administrator.')
      } else {
        setError(`Failed to verify password: ${error.message || 'Unknown error'}. Please try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '48px',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '8px',
            }}
          >
            Invoice System
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Enter password to access
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Enter access password"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            {error && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  color: '#ef4444',
                  fontSize: '13px',
                }}
              >
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 600,
              background:
                loading || !password.trim()
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <p
          style={{
            margin: '24px 0 0 0',
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          This is a private system. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}

