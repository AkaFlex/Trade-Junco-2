import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Modal de confirmação do padrão Junco (PADROES-JUNCO.md §3.4) — substitui window.confirm.
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
  const opener = useRef<Element | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => new Promise<boolean>(resolve => {
    opener.current = document.activeElement;
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
    (opener.current as HTMLElement | null)?.focus?.();
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
        <div className="overlay z-[9998] items-center" onClick={() => close(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="modal max-w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h2 id="confirm-title">{opts.title}</h2></div>
            {opts.message && <div className="px-6 pt-5 pb-1.5 text-[14px] leading-relaxed">{opts.message}</div>}
            <div className="modal-foot border-t-0">
              <button onClick={() => close(false)} className="btn">{opts.cancelLabel || 'Cancelar'}</button>
              <button ref={confirmBtn} onClick={() => close(true)} className={opts.danger ? 'btn-danger' : 'btn-primary'}>
                {opts.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
