import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// Substitui window.confirm (padrão P2 da empresa).
// Uso: const confirm = useConfirm(); if (await confirm({ title: '...', message: '...' })) { ... }

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a <ConfirmProvider>');
  return ctx;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => new Promise<boolean>(resolve => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="bg-white w-full max-w-md rounded-md border border-line shadow-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 flex gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${opts.danger ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-navy'}`}>
                {opts.danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
              </div>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-condensed font-bold uppercase tracking-wide text-navy text-lg">{opts.title}</h2>
                {opts.message && <div className="text-sm text-gray-600 mt-1 leading-relaxed">{opts.message}</div>}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded border border-line text-gray-700 font-condensed font-semibold uppercase tracking-wide text-sm hover:bg-gray-50"
              >
                {opts.cancelLabel || 'Cancelar'}
              </button>
              <button
                ref={confirmBtn}
                onClick={() => close(true)}
                className={`px-4 py-2 rounded text-white font-condensed font-semibold uppercase tracking-wide text-sm ${opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:opacity-90'}`}
              >
                {opts.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
