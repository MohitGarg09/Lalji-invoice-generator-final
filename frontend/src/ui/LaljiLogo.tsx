
type LaljiLogoProps = {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  animated?: boolean
}

export default function LaljiLogo({ size = 'medium', showText = true, animated = true }: LaljiLogoProps) {
  const sizes = {
    small: { width: 120, height: 80, fontSize: 24 },
    medium: { width: 180, height: 120, fontSize: 32 },
    large: { width: 240, height: 160, fontSize: 42 }
  }
  
  const currentSize = sizes[size]
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        animation: animated ? 'logoFloat 3s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes logoGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(197, 48, 48, 0.4);
            filter: drop-shadow(0 4px 8px rgba(197, 48, 48, 0.3));
          }
          50% { 
            box-shadow: 0 0 30px rgba(197, 48, 48, 0.6);
            filter: drop-shadow(0 6px 12px rgba(197, 48, 48, 0.4));
          }
        }
        
        .logo-container {
          animation: ${animated ? 'logoGlow 2s ease-in-out infinite' : 'none'};
        }
      `}</style>
      
      {/* Main Logo */}
      <div 
        className="logo-container"
        style={{
          position: 'relative',
          width: currentSize.width,
          height: currentSize.height,
          background: '#C53030',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 25px rgba(197, 48, 48, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.9)',
          transform: 'rotate(-1deg)',
        }}
      >
        {/* Munna Seth's text */}
        {showText && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            color: 'white',
            fontFamily: 'cursive',
            fontStyle: 'italic',
            opacity: 0.9,
          }}>
            Munna Seth's
          </div>
        )}
        
        {/* Main Lalji text */}
        <div style={{
          fontSize: currentSize.fontSize,
          fontWeight: 'bold',
          color: 'white',
          fontFamily: 'serif',
          letterSpacing: '2px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          marginTop: showText ? '12px' : '0',
        }}>
          Lalji
        </div>
        
        {/* CATERERS text */}
        <div style={{
          fontSize: size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px',
          color: 'white',
          fontWeight: 'bold',
          letterSpacing: '3px',
          marginTop: '4px',
        }}>
          CATERERS
        </div>
        
        {/* Utensil icons */}
        <div style={{
          position: 'absolute',
          right: '-15px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* Green utensil */}
          <div style={{
            width: size === 'small' ? '20px' : size === 'medium' ? '25px' : '30px',
            height: size === 'small' ? '20px' : size === 'medium' ? '25px' : '30px',
            background: '#38A169',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(56, 161, 105, 0.4)',
          }}>
            🍴
          </div>
          
          {/* Yellow utensil */}
          <div style={{
            width: size === 'small' ? '20px' : size === 'medium' ? '25px' : '30px',
            height: size === 'small' ? '20px' : size === 'medium' ? '25px' : '30px',
            background: '#D69E2E',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(214, 158, 46, 0.4)',
          }}>
            🥄
          </div>
        </div>
        
        {/* It's Party Time text */}
        {showText && (
          <div style={{
            position: 'absolute',
            bottom: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
            color: '#333',
            fontFamily: 'cursive',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
          }}>
            It's Party Time...
          </div>
        )}
      </div>
      
      {/* Contact info */}
      {showText && size !== 'small' && (
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: size === 'medium' ? '11px' : '13px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '0.5px',
        }}>
          AKOLA, CELL: 09422959713
        </div>
      )}
    </div>
  )
}
