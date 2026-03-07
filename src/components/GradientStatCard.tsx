'use client';

// New Gradient Stat Card Component - Inspired by Fincheck/Peymen designs

interface GradientStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  variant: 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'rose';
  size?: 'default' | 'large';
}

const gradients = {
  blue: {
    card: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
    icon: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    text: '#1e40af',
    subtext: '#3b82f6'
  },
  purple: {
    card: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #d8b4fe 100%)',
    icon: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    text: '#6b21a8',
    subtext: '#7c3aed'
  },
  green: {
    card: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)',
    icon: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    text: '#166534',
    subtext: '#16a34a'
  },
  amber: {
    card: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
    icon: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    text: '#92400e',
    subtext: '#b45309'
  },
  cyan: {
    card: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 50%, #67e8f9 100%)',
    icon: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    text: '#155e75',
    subtext: '#0891b2'
  },
  rose: {
    card: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 50%, #fda4af 100%)',
    icon: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    text: '#9f1239',
    subtext: '#e11d48'
  }
};

export function GradientStatCard({ 
  label, 
  value, 
  subtext, 
  trend, 
  icon, 
  variant,
  size = 'default'
}: GradientStatCardProps) {
  const colors = gradients[variant];
  
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: '20px',
        padding: size === 'large' ? '28px' : '24px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          right: '40px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          pointerEvents: 'none'
        }}
      />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header with icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.subtext,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {label}
          </div>
          {icon && (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: colors.icon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {icon}
            </div>
          )}
        </div>
        
        {/* Value */}
        <div
          style={{
            fontSize: size === 'large' ? '42px' : '36px',
            fontWeight: '700',
            color: colors.text,
            lineHeight: '1',
            letterSpacing: '-0.02em',
            marginBottom: trend || subtext ? '12px' : '0'
          }}
        >
          {value}
        </div>
        
        {/* Trend or Subtext */}
        {trend && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              background: trend.direction === 'up' ? 'rgba(22, 163, 74, 0.15)' : 
                         trend.direction === 'down' ? 'rgba(220, 38, 38, 0.15)' : 
                         'rgba(100, 116, 139, 0.15)',
              color: trend.direction === 'up' ? '#16a34a' : 
                     trend.direction === 'down' ? '#dc2626' : 
                     '#64748b'
            }}
          >
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.value}
          </div>
        )}
        
        {subtext && !trend && (
          <div
            style={{
              fontSize: '13px',
              color: colors.subtext,
              fontWeight: '500'
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
