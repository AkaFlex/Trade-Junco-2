import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Substitui <select> nativo (padrão P2 da empresa).

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T | '';
  options: readonly (Option<T> | T)[];
  onChange: (value: T) => void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

const norm = <T extends string>(o: Option<T> | T): Option<T> =>
  typeof o === 'string' ? { value: o, label: o } : o;

export function OptionSelect<T extends string>({ value, options, onChange, placeholder = 'Selecione...', id, ariaLabel, className = '' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const items = options.map(norm);
  const selected = items.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const choose = (v: T) => { onChange(v); setOpen(false); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(Math.max(0, items.findIndex(o => o.value === value))); return; }
      setActive(a => (a + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) { e.preventDefault(); choose(items[active].value); }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => { setOpen(o => !o); setActive(Math.max(0, items.findIndex(o => o.value === value))); }}
        onKeyDown={onKeyDown}
        className="w-full flex items-center justify-between gap-2 bg-white border border-line rounded-md px-3 py-2.5 text-left text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-navy/30"
      >
        <span className={selected ? '' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-64 overflow-auto bg-white border border-line rounded-md shadow-modal py-1"
        >
          {items.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={e => e.preventDefault()}
              onClick={() => choose(o.value)}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${i === active ? 'bg-paper' : ''} ${o.value === value ? 'font-semibold text-navy' : 'text-gray-700'}`}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Grupo de opções em botões (escolha única), para listas curtas. */
export function OptionButtons<T extends string>({ value, options, onChange, ariaLabel }: Omit<Props<T>, 'placeholder' | 'id' | 'className'>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map(norm).map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 rounded-md border text-sm font-semibold transition ${o.value === value ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-line hover:bg-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
