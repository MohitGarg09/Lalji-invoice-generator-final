
type LaljiLogoProps = {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function LaljiLogo({ size = 'medium', className = '' }: LaljiLogoProps) {
  const sizes = {
    small: { width: 500, height: 400 },
    medium: { width: 300, height: 150 },
    large: { width: 400, height: 200 }
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
        src="/lalji-logo.png" 
        alt="Lalji Caterers - Munna Seth's" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
        }}
      />
    </div>
  )
}
