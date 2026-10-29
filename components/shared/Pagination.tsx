import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE = 25;

/** Paginação simples no cliente: devolve a fatia da página e volta à página 1 quando a lista muda de tamanho. */
export const usePagination = <T,>(items: T[], pageSize: number = PAGE_SIZE) => {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = Math.min(page, pages);
  return {
    page: current,
    pages,
    setPage,
    reset: () => setPage(1),
    slice: items.slice((current - 1) * pageSize, current * pageSize),
    from: items.length === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
};

/** Lista de páginas com reticências: 1 … 4 5 [6] 7 8 … 20. */
const windowOf = (page: number, pages: number): (number | '…')[] => {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
};

export const Pagination: React.FC<{ page: number; pages: number; from: number; to: number; total: number; onPage: (p: number) => void; noun?: string }> = ({ page, pages, from, to, total, onPage, noun = 'resultados' }) => {
  if (total === 0) return null;
  return (
    <nav aria-label="Paginação" className="px-5 py-2.5 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
      <span aria-live="polite">Mostrando {from}–{to} de {total} {noun}</span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button className="iconbtn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={15} /></button>
          {windowOf(page, pages).map((p, i) => p === '…'
            ? <span key={`e${i}`} className="px-1" aria-hidden="true">…</span>
            : <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} aria-label={`Página ${p}`}
                className={p === page ? 'chip chip-active' : 'chip'}>{p}</button>)}
          <button className="iconbtn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima página"><ChevronRight size={15} /></button>
        </div>
      )}
    </nav>
  );
};
