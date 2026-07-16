import React from 'react';

export const FadeIn = ({ children, delay = 0, className = "" }) => {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out fill-mode-both ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export const Button = ({ 
  variant = 'primary', 
  children, 
  className = "", 
  icon: Icon,
  ...props 
}) => {
  const variants = {
    primary: "bg-[#111111] text-[#F5F5F3] hover:opacity-90",
    outline: "bg-transparent border-2 border-[#111111] text-[#111111] hover:bg-[#FAFAF8]",
    accent: "bg-[#1B4332] text-[#F5F5F3] hover:opacity-90"
  };

  return (
    <button 
      className={`px-8 py-4 rounded-full font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon size={18} />}
    </button>
  );
};

export const Card = ({ variant = 'light', children, className = "" }) => {
  const variants = {
    light: "bg-white border border-[#E5E4E0]",
    dark: "bg-[#0F1210] text-[#F5F5F3] border border-white/10"
  };

  return (
    <div className={`p-8 md:p-12 rounded-[16px] ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
