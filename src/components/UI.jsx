import React from 'react';

/**
 * Standard spacing-aware Container component (Rule #3)
 */
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

/**
 * Professional Button using design tokens (Rule #8)
 */
export const Button = ({ 
  variant = 'primary', 
  children, 
  className = "", 
  icon: Icon,
  loading = false,
  ...props 
}) => {
  const variants = {
    primary: "bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] hover:opacity-90 active:scale-[0.98]",
    outline: "bg-transparent border-2 border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-base)] active:scale-[0.98]",
    accent: "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98]",
    ghost: "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-base)] active:scale-[0.98]"
  };

  return (
    <button 
      className={`
        inline-flex items-center justify-center gap-[var(--spacing-2)]
        px-[var(--spacing-6)] py-[var(--spacing-4)]
        rounded-[var(--radius-pill)]
        font-bold text-[14px] uppercase tracking-widest
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} 
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && children}
      {!loading && Icon && <Icon size={18} className="transition-transform group-hover:translate-x-1" />}
    </button>
  );
};

/**
 * Uniform Card component (Rule #2)
 */
export const Card = ({ variant = 'light', children, className = "", style = {} }) => {
  const variants = {
    light: "bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]",
    dark: "bg-[var(--color-bg-dark)] text-[var(--color-text-inverse)] border border-white/10"
  };

  return (
    <div 
      className={`p-[var(--spacing-6)] md:p-[var(--spacing-7)] rounded-[var(--radius-lg)] ${variants[variant]} ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
};

/**
 * Skeleton Loader (Rule #5)
 */
export const Skeleton = ({ className = "" }) => (
  <div className={`bg-[var(--color-text-primary)]/5 animate-pulse rounded-[var(--radius-md)] ${className}`} />
);

/**
 * Badge Component
 */
export const Badge = ({ children, className = "" }) => (
  <span className={`
    inline-flex items-center gap-[var(--spacing-2)]
    px-[var(--spacing-3)] py-[var(--spacing-1)]
    bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
    rounded-[var(--radius-pill)]
    text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]
    ${className}
  `}>
    {children}
  </span>
);
