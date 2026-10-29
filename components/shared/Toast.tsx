
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------
const ToastContext = createContext<ToastContextValue | null>(null);

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
};

// ------------------------------------------------------------------
// Single Toast Item
// ------------------------------------------------------------------
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} className="text-green-junco shrink-0" />,
  error:   <XCircle     size={20} className="text-[#F48FB1] shrink-0" />,
  warning: <AlertTriangle size={20} className="text-yellow-junco shrink-0" />,
  info:    <Info        size={20} className="text-blue-junco shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  warning: 'border-l-yellow-500',
  info:    'border-l-blue-500',
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    // Padrão Junco: avisos somem em ~3 s; erro fica até ser fechado.
    if (toast.type === 'error' && toast.duration === undefined) return;
    const dur = toast.duration ?? 3500;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 350);
    }, dur);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 bg-navy text-white rounded-[5px] shadow-modal border-l-4 ${BORDER[toast.type]}
        p-4 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto
        transition-[opacity,transform] duration-350
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-condensed font-semibold tracking-wide leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 350); }}
        aria-label="Fechar aviso"
        className="text-white/50 hover:text-white transition shrink-0 ml-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// ------------------------------------------------------------------
// Provider + Container
// ------------------------------------------------------------------
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}`;
    setToasts(prev => [...prev, { ...opts, id }].slice(-3));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) =>
    addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) =>
    addToast({ type: 'error', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) =>
    addToast({ type: 'warning', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) =>
    addToast({ type: 'info', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" role="status" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
