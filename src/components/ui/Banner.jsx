import React from 'react';
import { X } from 'lucide-react';

export default function Banner({ id, message, variant = 'normal', height = '2.5rem', className = '' }) {
  const storageKey = id ? `banner-${id}` : null;
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    if (storageKey) setOpen(localStorage.getItem(storageKey) !== 'true');
  }, [storageKey]);

  const close = () => {
    setOpen(false);
    if (storageKey) localStorage.setItem(storageKey, 'true');
  };

  if (!open) return null;
  return (
    <div
      id={id}
      role="status"
      style={{ minHeight: height }}
      className={`relative flex items-center justify-center rounded-xl px-10 text-center text-xs font-semibold ${variant === 'rainbow' ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-color)]'} ${className}`}
    >
      {message}
      {id && <button type="button" onClick={close} aria-label="Cerrar aviso" className="absolute right-2 rounded-lg p-1 hover:bg-black/10"><X className="h-4 w-4" /></button>}
    </div>
  );
}
