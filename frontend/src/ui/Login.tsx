import React, { useState, useEffect } from 'react'
import LaljiLogo from './LaljiLogo'

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
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
          setError(`Cannot connect to server. Please check your internet connection and try again.`)
        }
      } else if (error.message?.includes('CORS')) {
        setError('Server configuration issue. Please contact administrator.')
      } else {
        setError(`Login failed. Please check your password and try again.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
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
            transform: scale(1.03);
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
            transform: translateY(-6px);
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
        
        .login-container {
          animation: ${mounted ? 'fadeInUp 0.5s ease-out' : 'none'};
        }
        
        .logo-container {
          animation: ${mounted ? 'slideInLeft 0.6s ease-out 0.2s both' : 'none'};
        }
        
        .form-container {
          animation: ${mounted ? 'fadeInUp 0.6s ease-out 0.3s both' : 'none'};
        }
        
        .floating-element {
          animation: float 2s ease-in-out infinite;
        }
        
        .shimmer-button {
          background: linear-gradient(90deg, #C53030 25%, #E53E3E 50%, #C53030 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .input-focus {
          transition: all 0.2s ease;
        }
        
        .input-focus:focus {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(197, 48, 48, 0.25);
          border-color: #C53030;
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Floating decorative elements */}
        <div
          className="floating-element"
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            animationDelay: '0s',
          }}
        />
        <div
          className="floating-element"
          style={{
            position: 'absolute',
            top: '20%',
            right: '15%',
            width: '40px',
            height: '40px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            animationDelay: '1s',
          }}
        />
        <div
          className="floating-element"
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '20%',
            width: '50px',
            height: '50px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            animationDelay: '2s',
          }}
        />
        
        <div
          className="login-container"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)',
            padding: '80px 20px',
            maxWidth: '900px',
            width: '100%',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
          }}
        >
          {/* Logo section */}
          <div className="logo-container" style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LaljiLogo size="xlarge" />
            <p style={{ 
              margin: '-200px 0 0 0', 
              color: '#666', 
              fontSize: '16px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}>
              Invoice Management System
            </p>
          </div>

          <div className="form-container">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#333',
                    marginBottom: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  Access Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="Enter your password"
                    autoFocus
                    className="input-focus"
                    style={{
                      width: '100%',
                      padding: '16px 50px 16px 20px',
                      fontSize: '16px',
                      border: error ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      fontWeight: 500,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#C53030',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(197, 48, 48, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {error && (
                  <div
                    style={{
                      margin: '12px 0 0 0',
                      padding: '12px 16px',
                      color: '#dc2626',
                      fontSize: '14px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className={loading ? '' : 'shimmer-button'}
                style={{
                  width: '100%',
                  padding: '18px',
                  fontSize: '17px',
                  fontWeight: 700,
                  background: loading || !password.trim()
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: loading || !password.trim() 
                    ? 'none' 
                    : '0 8px 25px rgba(102, 126, 234, 0.3)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => {
                  if (!loading && password.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && password.trim()) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)'
                  }
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Verifying...
                  </span>
                ) : 'Access System'}
              </button>
            </form>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '32px',
              padding: '20px',
              background: 'rgba(197, 48, 48, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(197, 48, 48, 0.1)'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#666',
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                🔒 Secure Access Portal<br />
                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                  Authorized personnel only
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

