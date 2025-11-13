
type LaljiLogoProps = {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function LaljiLogo({ size = 'medium', className = '' }: LaljiLogoProps) {
  const sizes = {
    small: { width: 160, height: 80 },
    medium: { width: 250, height: 125 },
    large: { width: 320, height: 160 }
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
        maxWidth: '100%',
        flexShrink: 0,
      }}
    >
      <img 
        src="/lalji-logo.png" 
        alt="Lalji Caterers - Munna Seth's" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))',
        }}
      />
    </div>
  )
}
