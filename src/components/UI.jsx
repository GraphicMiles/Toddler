import React from 'react';

/**
 * Standard professional Container
 */
export const Container = ({ children, className = "", size = "default" }) => {
  const widths = {
    default: "max-w-[var(--width-container)]",
    prose: "max-w-[var(--width-prose)]",
    wide: "max-w-[1400px]"
  };

  return (
    <div className={`${widths[size]} mx-auto px-[var(--spacing-6)] md:px-[var(--spacing-8)] ${className}`}>
      {children}
    </div>
  );
};

/**
 * Premium Button with the requested shine effect
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
    sm: "px-[var(--spacing-5)] py-[var(--spacing-2)] text-[11px]",
    md: "px-[var(--spacing-6)] py-[var(--spacing-3)] text-[13px]",
    lg: "px-[var(--spacing-8)] py-[var(--spacing-4)] text-[15px]"
  };

  const variants = {
    primary: "bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] glow-lime hover:brightness-110",
    secondary: "bg-[var(--color-accent-violet)] text-white glow-violet hover:brightness-110",
    outline: "bg-white/5 border border-[var(--color-border-subtle)] text-white backdrop-blur-md hover:border-white/20",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-white"
  };

  return (
    <button 
      className={`
        inline-flex items-center justify-center gap-[var(--spacing-2)]
        rounded-[var(--radius-pill)]
        font-bold uppercase tracking-[0.15em]
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
      <span className="absolute top-0 left-[-60%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] transition-all duration-500 group-hover:left-[130%]" />
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>{children} {Icon && <Icon size={size === 'sm' ? 14 : 18} />}</>}
    </button>
  );
};

/**
 * Standard Card
 */
export const Card = ({ variant = 'surface', children, className = "", style = {} }) => {
  const variants = {
    surface: "bg-gradient-to-b from-white/5 to-white/[0.01] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] backdrop-blur-xl",
    green: "bg-black border border-[var(--color-accent-lime)] shadow-[0_0_20px_rgba(198,255,51,0.05)]",
    purple: "bg-black border border-[var(--color-accent-violet)] shadow-[0_0_20px_rgba(125,57,235,0.05)]",
    dark: "bg-[var(--color-bg-dark)] border border-white/5"
  };
  return <div className={`p-[var(--spacing-7)] md:p-[var(--spacing-8)] rounded-[var(--radius-xl)] ${variants[variant]} ${className}`} style={style}>{children}</div>;
};

export const Badge = ({ children, variant = "neutral" }) => {
  const variants = {
    neutral: "bg-white/5 border-white/10 text-[var(--color-text-muted)]",
    green: "bg-[var(--color-accent-lime)]/10 border-[var(--color-accent-lime)]/20 text-[var(--color-accent-lime)]",
    purple: "bg-[var(--color-accent-violet)]/10 border-[var(--color-accent-violet)]/20 text-[var(--color-accent-violet)]"
  };
  return <span className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest ${variants[variant]}`}>{children}</span>;
};

export const Skeleton = ({ className = "" }) => <div className={`bg-white/5 animate-pulse rounded-xl ${className}`} />;
