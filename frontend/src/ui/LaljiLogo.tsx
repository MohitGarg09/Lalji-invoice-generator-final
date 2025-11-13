
type LaljiLogoProps = {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function LaljiLogo({ size = 'medium', className = '' }: LaljiLogoProps) {
  const sizes = {
    small: { width: 80, height: 40 },
    medium: { width: 120, height: 60 },
    large: { width: 160, height: 80 }
  }
  
  const currentSize = sizes[size]
  
  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: currentSize.width,
        height: currentSize.height,
      }}
    >
      {/* Placeholder for actual logo - you can replace this with an img tag when you have the logo file */}
      <div style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #C53030 0%, #B91C1C 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: size === 'small' ? '14px' : size === 'medium' ? '18px' : '24px',
        fontFamily: 'serif',
        letterSpacing: '1px',
        boxShadow: '0 2px 8px rgba(197, 48, 48, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        Lalji Caterers
      </div>
      
      {/* 
      To use actual logo image, replace the div above with:
      <img 
        src="/path/to/lalji-logo.png" 
        alt="Lalji Caterers" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
      */}
    </div>
  )
}
