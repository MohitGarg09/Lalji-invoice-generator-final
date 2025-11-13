
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
        fontSize: size === 'small' ? '24px' : size === 'medium' ? '32px' : '40px',
        fontWeight: 'bold',
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        fontFamily: 'serif',
        letterSpacing: '2px',
      }}>
        🍽️ Lalji Caterers
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
