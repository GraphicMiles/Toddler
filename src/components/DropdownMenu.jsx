import { useEffect, useRef, useState, useCallback } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import './DropdownMenu.css';

export default function DropdownMenu({ value, options = [], onChange, label = 'Select', className = '' }) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const root = useRef(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  // Reset focus index when closing
  useEffect(() => { if (!open) setFocusIndex(-1); }, [open]);

  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setFocusIndex(0);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < options.length) {
          onChange(options[focusIndex].value);
          setOpen(false);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIndex(options.length - 1);
        break;
      default:
        break;
    }
  }, [open, focusIndex, options, onChange]);

  return <div className={`dropdown ${open ? 'open' : ''} ${className}`} ref={root} onKeyDown={handleKeyDown}>
    <button type="button" className="dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(next => !next)}>
      <span>{selected?.label || label}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="dropdown-menu" role="listbox" aria-label={label}>
      <div className="dropdown-menu-head"><span>{label}</span><button type="button" onClick={() => setOpen(false)} aria-label="Close menu"><X size={15} /></button></div>
      {options.map((option, i) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={`dropdown-option ${option.value === value ? 'selected' : ''} ${i === focusIndex ? 'focused' : ''}`} onClick={() => { onChange(option.value); setOpen(false); }} onMouseEnter={() => setFocusIndex(i)}><span>{option.label}</span>{option.value === value && <Check size={15} />}</button>)}
    </div>}
  </div>;
}
