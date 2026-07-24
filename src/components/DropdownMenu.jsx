import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import './DropdownMenu.css';

export default function DropdownMenu({ value, options, onChange, label = 'Select', className = '' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <div className={`dropdown ${open ? 'open' : ''} ${className}`} ref={root}>
    <button type="button" className="dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(next => !next)}>
      <span>{selected?.label || label}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="dropdown-menu" role="listbox" aria-label={label}>
      <div className="dropdown-menu-head"><span>{label}</span><button type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X size={15} /></button></div>
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={`dropdown-option ${option.value === value ? 'selected' : ''}`} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={15} />}</button>)}
    </div>}
  </div>;
}
