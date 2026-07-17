import React from 'react';

export const Button = ({ 
  variant = 'primary', 
  children, 
  style = {}, 
  icon: Icon,
  loading = false,
  ...props 
}) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: '600',
    border: 'none',
    transition: 'all 0.2s cubic-bezier(.16,.8,.24,1)',
    cursor: loading ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    opacity: loading ? 0.7 : 1
  };
  
  const variants = {
    primary: { backgroundColor: '#111111', color: '#F5F5F3' },
    outline: { backgroundColor: 'transparent', color: '#111111', border: '2px solid #111111' },
    accent: { backgroundColor: '#1B4332', color: '#F5F5F3' }
  };

  return (
    <button 
      style={{ ...baseStyle, ...variants[variant], ...style }} 
      disabled={loading}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && children}
      {!loading && Icon && <Icon size={18} />}
    </button>
  );
};

export const Skeleton = ({ className = "", style = {} }) => (
  <div 
    className={`bg-[#111111]/5 animate-pulse rounded-lg ${className}`}
    style={{ ...style }}
  />
);

export const Card = ({ variant = 'light', children, className = "", style = {} }) => {
  const variants = {
    light: "bg-white border border-[#E5E4E0]",
    dark: "bg-[#0F1210] text-[#F5F5F3] border border-white/10"
  };

  return (
    <div className={`p-8 md:p-12 rounded-[16px] ${variants[variant]} ${className}`} style={style}>
      {children}
    </div>
  );
};
