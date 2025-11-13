
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
      <img 
        src="/lalji-logo.jpg" 
        alt="Lalji Caterers - Munna Seth's" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
        }}
      />
    </div>
  )
}
