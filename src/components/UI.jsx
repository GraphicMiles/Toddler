import React from 'react';

export const Container = ({ children, className = "", size = "default" }) => {
  const widths = {
    default: "max-w-[var(--width-container)]",
    prose: "max-w-[var(--width-prose)]",
    tight: "max-w-[640px]",
    wide: "max-w-[1400px]"
  };

  return (
    <div className={`${widths[size]} mx-auto px-[var(--spacing-5)] md:px-[var(--spacing-6)] ${className}`}>
      {children}
    </div>
  );
};

export const Button = ({ 
  variant = 'primary', 
  size = 'md',
  children, 
  className = "", 
  icon: Icon,
  loading = false,
  ...props 
}) => {
  const sizes = {
    sm: "px-[var(--spacing-4)] py-[var(--spacing-2)] text-[11px]",
    md: "px-[var(--spacing-5)] py-[var(--spacing-2.5)] text-[13px]",
    lg: "px-[var(--spacing-7)] py-[var(--spacing-4)] text-[15px]"
  };

  const variants = {
    primary: "bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] hover:bg-black active:scale-[0.98]",
    outline: "bg-transparent border border-[var(--color-text-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-base)] active:scale-[0.98]",
    accent: "bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98]",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-black/5 active:scale-[0.98]"
  };

  return (
    <button 
      className={`
        inline-flex items-center justify-center gap-[var(--spacing-2)]
        rounded-[var(--radius-pill)]
        font-bold uppercase tracking-[0.15em]
        transition-all duration-200
        disabled:opacity-30 disabled:cursor-not-allowed
        cursor-pointer border-none
        ${variants[variant]} 
        ${sizes[size]}
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && children}
      {!loading && Icon && <Icon size={size === 'sm' ? 14 : 16} className="transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
};

export const Card = ({ variant = 'light', children, className = "", style = {} }) => {
  const variants = {
    light: "bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm",
    dark: "bg-[var(--color-bg-dark)] text-[var(--color-text-inverse)] border border-white/5 shadow-2xl"
  };

  return (
    <div 
      className={`p-[var(--spacing-6)] md:p-[var(--spacing-8)] rounded-[var(--radius-lg)] ${variants[variant]} ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
};

export const Skeleton = ({ className = "" }) => (
  <div className={`bg-[var(--color-text-primary)]/5 animate-pulse rounded-[var(--radius-md)] ${className}`} />
);

export const Badge = ({ children, className = "" }) => (
  <span className={`
    inline-flex items-center gap-[var(--spacing-2)]
    px-[var(--spacing-3)] py-[var(--spacing-1)]
    bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
    rounded-[var(--radius-pill)]
    text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]
    ${className}
  `}>
    {children}
  </span>
);
