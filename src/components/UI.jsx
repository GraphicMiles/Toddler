import React from 'react';

/**
 * Standard spacing-aware Container component
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
 * Premium Button following the provided guide
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
    sm: "px-[var(--spacing-5)] py-[var(--spacing-2.5)] text-[14px]",
    md: "px-[var(--spacing-6)] py-[var(--spacing-4)] text-[15px]",
    lg: "px-[var(--spacing-8)] py-[var(--spacing-5)] text-[17px]"
  };

  const variants = {
    primary: "bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] glow-lime hover:brightness-110",
    secondary: "bg-[var(--color-accent-violet)] text-[var(--color-text-primary)] glow-violet hover:brightness-110",
    outline: "bg-white/5 border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] backdrop-blur-md hover:border-[var(--color-accent-violet-soft)]",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
  };

  return (
    <button 
      className={`
        inline-flex items-center justify-center gap-[var(--spacing-2)]
        rounded-[var(--radius-pill)]
        font-semibold tracking-tight
        transition-all duration-300
        disabled:opacity-30 disabled:cursor-not-allowed
        cursor-pointer border-none
        relative overflow-hidden group
        ${variants[variant]} 
        ${sizes[size]}
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {/* Shine effect from guide */}
      <span className="absolute top-0 left-[-60%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] transition-all duration-500 group-hover:left-[130%]" />
      
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && children}
      {!loading && Icon && <Icon size={18} className="transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
};

/**
 * Uniform Card component
 */
export const Card = ({ variant = 'surface', children, className = "", style = {} }) => {
  const variants = {
    surface: "bg-gradient-to-b from-white/5 to-white/[0.01] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] backdrop-blur-xl",
    dark: "bg-gradient-to-br from-[#2E1560] to-[#170B34] border border-[var(--color-accent-violet)]/40 border-t-[var(--color-accent-violet-soft)]/50 shadow-[0_30px_70px_-30px_rgba(125,57,235,.55)]",
    ownership: "bg-gradient-to-br from-[#1A0F35] to-[#0A0A0D] border border-[var(--color-border-subtle)]"
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

export const Skeleton = ({ className = "" }) => (
  <div className={`bg-white/5 animate-pulse rounded-[var(--radius-md)] ${className}`} />
);

export const Badge = ({ children, className = "" }) => (
  <span className={`
    inline-flex items-center gap-[var(--spacing-2)]
    px-[var(--spacing-4)] py-[var(--spacing-2)]
    border border-[var(--color-border-subtle)]
    rounded-[var(--radius-pill)]
    text-[13px] text-[var(--color-text-muted)]
    ${className}
  `}>
    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_8px_1px_rgba(198,255,51,0.8)]" />
    {children}
  </span>
);
