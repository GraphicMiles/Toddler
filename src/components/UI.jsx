import React, { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.unobserve(entry.target);
      }
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return [elementRef, isIntersecting];
};

export const FadeIn = ({ children, delay = 0, className = "" }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
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
    primary: "bg-text-primary text-text-primary-inverse hover:opacity-90",
    outline: "bg-transparent border-2 border-text-primary text-text-primary hover:bg-bg-base",
    accent: "bg-accent text-accent-fg hover:opacity-90"
  };

  return (
    <button 
      className={`px-8 py-4 rounded-full font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon size={18} className="transition-transform group-hover:translate-x-1" />}
    </button>
  );
};

export const Card = ({ variant = 'light', children, className = "" }) => {
  const variants = {
    light: "bg-white border border-border-subtle",
    dark: "bg-bg-dark text-text-primary-inverse border border-white/10"
  };

  return (
    <div className={`p-8 md:p-12 rounded-[16px] ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
