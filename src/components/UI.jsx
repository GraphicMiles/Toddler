import React from 'react';

/**
 * Professional Container following Layout Discipline
 */
export const Container = ({ children, className = "", size = "default" }) => {
  const widths = {
    default: "max-w-[var(--width-container)]",
    prose: "max-w-[var(--width-prose)]",
    wide: "max-w-[1400px]",
    fluid: "max-w-none"
  };

  return (
    <div className={`${widths[size]} mx-auto px-[var(--spacing-6)] md:px-[var(--spacing-8)] ${className}`}>
      {children}
    </div>
  );
};

/**
 * Neon-themed Button
 */
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
    md: "px-[var(--spacing-6)] py-[var(--spacing-3)] text-[13px]",
    lg: "px-[var(--spacing-8)] py-[var(--spacing-4)] text-[15px]"
  };

  const variants = {
    // Neon Green background
    primary: "bg-[var(--color-accent-green)] text-[var(--color-text-inverse)] hover:brightness-110 active:scale-[0.98]",
    // Neon Purple background
    secondary: "bg-[var(--color-accent-purple)] text-[var(--color-text-primary)] hover:brightness-110 active:scale-[0.98]",
    // Outline with neon green
    outline: "bg-transparent border border-[var(--color-accent-green)] text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/10 active:scale-[0.98]",
    // Ghost
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] active:scale-[0.98]"
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
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && children}
      {!loading && Icon && <Icon size={size === 'sm' ? 14 : 18} />}
    </button>
  );
};

/**
 * Dark Surface Card
 */
export const Card = ({ variant = 'surface', children, className = "", style = {} }) => {
  const variants = {
    surface: "bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]",
    card: "bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]",
    purple: "bg-[var(--color-bg-dark)] border border-[var(--color-accent-purple)] shadow-[0_0_20px_rgba(125,57,235,0.15)]",
    green: "bg-[var(--color-bg-dark)] border border-[var(--color-accent-green)] shadow-[0_0_20px_rgba(198,255,51,0.1)]"
  };

  return (
    <div 
      className={`p-[var(--spacing-7)] md:p-[var(--spacing-8)] rounded-[var(--radius-xl)] ${variants[variant]} ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
};

export const Badge = ({ children, variant = "neutral", className = "" }) => {
  const variants = {
    neutral: "bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]",
    green: "bg-[var(--color-accent-green)]/10 border-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]",
    purple: "bg-[var(--color-accent-purple)]/10 border-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]"
  };

  return (
    <span className={`
      inline-flex items-center gap-[var(--spacing-2)]
      px-[var(--spacing-3)] py-[var(--spacing-1.5)]
      border rounded-[var(--radius-pill)]
      text-[10px] font-bold uppercase tracking-[0.2em]
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
};

export const Skeleton = ({ className = "" }) => (
  <div className={`bg-white/5 animate-pulse rounded-[var(--radius-md)] ${className}`} />
);
