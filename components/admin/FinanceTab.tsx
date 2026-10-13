import React, { useMemo, useRef, useState } from 'react';
import { Wallet, Receipt, CheckCircle, Eye, Loader2, DollarSign, Paperclip } from 'lucide-react';
import { TradeRequest } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { acceptAttr } from '../../services/uploadService';
import { Card, SectionTitle, TypeBadge, isEventLike, formatBRL, formatDateBR } from './shared';

interface Props {
  requests: TradeRequest[];
  busyId: string | null;
  onOpen: (r: TradeRequest) => void;
  onMarkPaid: (r: TradeRequest) => void;
  onAttachReceipt: (r: TradeRequest, files: File[]) => void;
  onCompleteWithoutReceipt: (r: TradeRequest) => void;
}

const Row: React.FC<{ r: TradeRequest; children: React.ReactNode; onOpen: (r: TradeRequest) => void }> = ({ r, children, onOpen }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-condensed font-bold text-purple-junco">{r.tradeCode}</span>
        <TypeBadge request={r} />
        <StatusBadge status={r.status} requestType={r.requestType} />
      </div>
      <div className="text-sm text-gray-800 mt-1 truncate">{r.rcaName} · {r.partnerCode} · {r.region}</div>
      {r.dateOfAction && <div className="text-xs text-muted">Data: {formatDateBR(r.dateOfAction)}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => onOpen(r)} aria-label="Ver detalhes" className="text-muted hover:text-navy p-2 rounded hover:bg-paper"><Eye size={18} /></button>
      {children}
    </div>
  </div>
);

export const FinanceTab: React.FC<Props> = ({ requests, busyId, onOpen, onMarkPaid, onAttachReceipt, onCompleteWithoutReceipt }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [receiptTarget, setReceiptTarget] = useState<TradeRequest | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  const { toPay, awaitingReceipt, paid } = useMemo(() => ({
    toPay: requests.filter(r => r.status === 'completed' && !isEventLike(r)),
    awaitingReceipt: requests.filter(r => r.status === 'completed' && isEventLike(r)),
    paid: requests.filter(r => r.status === 'paid'),
  }), [requests]);

  const totalToPay = toPay.reduce((s, r) => s + Number(r.totalValue || 0), 0);

  const pickReceipt = (r: TradeRequest) => {
    setReceiptTarget(r);
    fileInput.current?.click();
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        accept={acceptAttr(['image', 'pdf'])}
        onChange={e => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (receiptTarget && files.length) onAttachReceipt(receiptTarget, files);
          setReceiptTarget(null);
        }}
      />

      <Card>
        <div className="p-5 border-b border-line">
          <SectionTitle icon={<Wallet size={18} />} right={<span className="text-sm font-semibold text-navy">{formatBRL(totalToPay)}</span>}>
            Degustações a pagar ({toPay.length})
          </SectionTitle>
          <p className="text-xs text-muted -mt-2">RCA já enviou fotos, notas e PIX. Confira os dados em "Ver detalhes" antes de pagar.</p>
        </div>
        <div className="divide-y divide-line">
          {toPay.length === 0 && <p className="p-6 text-center text-sm text-muted">Nada a pagar no momento.</p>}
          {toPay.map(r => (
            <Row key={r.id} r={r} onOpen={onOpen}>
              <span className="font-semibold text-gray-800 mr-1">{formatBRL(r.totalValue)}</span>
              <button onClick={() => onMarkPaid(r)} disabled={busyId === r.id} className="bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-800 disabled:opacity-50 flex items-center gap-1">
                {busyId === r.id ? <Loader2 className="animate-spin" size={12} /> : <DollarSign size={12} />} Marcar como pago
              </button>
            </Row>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-line">
          <SectionTitle icon={<Receipt size={18} />}>Aguardando recibo ({awaitingReceipt.length})</SectionTitle>
          <p className="text-xs text-muted -mt-2">Personalizações, eventos e ações sociais aprovados. Quando o recibo/NF chegar, anexe aqui para concluir.</p>
        </div>
        <div className="divide-y divide-line">
          {awaitingReceipt.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhum recibo pendente.</p>}
          {awaitingReceipt.map(r => (
            <Row key={r.id} r={r} onOpen={onOpen}>
              <button onClick={() => pickReceipt(r)} disabled={busyId === r.id} className="bg-navy text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                {busyId === r.id ? <Loader2 className="animate-spin" size={12} /> : <Paperclip size={12} />} Anexar recibo e concluir
              </button>
              <button onClick={() => onCompleteWithoutReceipt(r)} disabled={busyId === r.id} className="bg-white text-gray-700 border border-line px-3 py-1.5 rounded text-xs font-bold hover:bg-paper disabled:opacity-50">
                Concluir sem recibo
              </button>
            </Row>
          ))}
        </div>
      </Card>

      <Card>
        <button onClick={() => setShowPaid(s => !s)} aria-expanded={showPaid} className="w-full p-5 flex items-center justify-between text-left">
          <span className="font-condensed font-bold uppercase tracking-wide text-navy text-lg flex items-center gap-2">
            <CheckCircle size={18} /> Pagos / concluídos ({paid.length})
          </span>
          <span className="text-xs text-muted">{showPaid ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {showPaid && (
          <div className="divide-y divide-line border-t border-line">
            {paid.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhum registro.</p>}
            {paid.map(r => (
              <Row key={r.id} r={r} onOpen={onOpen}>
                {!isEventLike(r) && <span className="font-semibold text-gray-800">{formatBRL(r.totalValue)}</span>}
              </Row>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
