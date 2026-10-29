import React, { useEffect, useState } from 'react';

// QR do link do Sell-Out para a degustadora apontar a câmera (qrcode-generator, MIT, carregado só quando a tela aparece).
// O SVG é montado com <rect> em React (sem innerHTML).
export const LinkQR: React.FC<{ link: string; label?: string }> = ({ link, label = 'QR do link do Sell-Out' }) => {
  const [cells, setCells] = useState<boolean[][] | null>(null);

  useEffect(() => {
    let alive = true;
    import('qrcode-generator').then(mod => {
      const qr = (mod.default as any)(0, 'M');
      qr.addData(link);
      qr.make();
      const n = qr.getModuleCount();
      const grid = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c) as boolean));
      if (alive) setCells(grid);
    }).catch(() => { /* sem QR: o botão de copiar link continua disponível */ });
    return () => { alive = false; };
  }, [link]);

  if (!cells) return null;
  const n = cells.length;
  const m = 2; // margem silenciosa
  return (
    <figure className="card-inner p-3 inline-flex flex-col items-center gap-1.5 m-0" data-testid="qr-sellout">
      <svg role="img" aria-label={label} viewBox={`0 0 ${n + m * 2} ${n + m * 2}`} width="140" height="140" shapeRendering="crispEdges">
        <rect width="100%" height="100%" fill="#fff" />
        {cells.flatMap((row, r) => row.map((d, c) => d ? <rect key={`${r}-${c}`} x={c + m} y={r + m} width="1" height="1" fill="#1B2A4A" /> : null))}
      </svg>
      <figcaption className="hint">Aponte a câmera para abrir o Sell-Out</figcaption>
    </figure>
  );
};
