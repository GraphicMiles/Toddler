import React from 'react';

export const Container = ({ children, className = "", size = "default" }) => {
  const widths = {
    default: "max-w-[var(--width-container)]",
    prose: "max-w-[var(--width-prose)]",
    wide: "max-w-[1400px]"
  };

  return (
    <div className={`${widths[size]} w-full mx-auto px-4 md:px-8 ${className}`}>
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
    sm: "px-4 py-2 text-[14px]",
    md: "px-6 py-3 text-[15px]",
    lg: "px-8 py-4 text-[17px]"
  };

  const variants = {
    primary: "bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] glow-lime hover:brightness-110 font-semibold",
    secondary: "bg-[var(--color-accent-violet)] text-white glow-violet hover:brightness-110 font-semibold",
    outline: "bg-white/5 border border-[var(--color-border-subtle)] text-white backdrop-blur-md hover:border-[var(--color-accent-violet-soft)] font-semibold",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-white font-semibold"
  };

  return (
    <button 
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full tracking-tight
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
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {children} 
          {Icon && <Icon size={size === 'sm' ? 16 : 18} className="transition-transform group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
};

export const Card = ({ variant = 'surface', children, className = "", style = {} }) => {
  const variants = {
    surface: "bg-gradient-to-b from-white/5 to-white/[0.01] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] backdrop-blur-xl",
    dark: "bg-gradient-to-br from-[#2E1560] to-[#170B34] border border-[var(--color-accent-violet)]/40 border-t-[var(--color-accent-violet-soft)]/50 shadow-[0_30px_70px_-30px_rgba(125,57,235,.27)]",
    ownership: "bg-gradient-to-br from-[#1A0F35] to-[#0A0A0D] border border-[var(--color-border-subtle)]",
    green: "bg-black border border-[var(--color-accent-lime)] shadow-[0_0_20px_rgba(198,255,51,0.05)]",
    purple: "bg-black border border-[var(--color-accent-violet)] shadow-[0_0_20px_rgba(125,57,235,0.05)]"
  };
  return (
    <div className={`p-6 md:p-8 rounded-[18px] ${variants[variant] || variants.surface} ${className}`} style={style}>
      {children}
    </div>
  );
};

export const Badge = ({ children, variant = "neutral", className = "" }) => {
  const variants = {
    neutral: "bg-white/5 border-[var(--color-border-subtle)] text-[var(--color-text-muted)]",
    green: "bg-[var(--color-accent-lime)] text-black font-bold",
    purple: "bg-[var(--color-accent-violet)]/10 border-[var(--color-accent-violet)]/20 text-[var(--color-accent-violet)]"
  };
  
  if (variant === "neutral") {
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-[13px] ${variants[variant]} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_8px_1px_rgba(198,255,51,0.8)]" />
        {children}
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-widest ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Skeleton = ({ className = "" }) => <div className={`bg-white/5 animate-pulse rounded-xl ${className}`} />;
