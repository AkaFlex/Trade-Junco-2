import React, { useMemo, useRef, useState } from 'react';
import { Wallet, Receipt, CheckCircle, Eye, Loader2, DollarSign, Paperclip, ChevronDown } from 'lucide-react';
import { TradeRequest } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { acceptAttr } from '../../services/uploadService';
import { Card, TypeBadge, isEventLike, formatBRL, formatDateBR } from './shared';

interface Props {
  requests: TradeRequest[];
  busyId: string | null;
  onOpen: (r: TradeRequest) => void;
  onMarkPaid: (r: TradeRequest) => void;
  onAttachReceipt: (r: TradeRequest, files: File[]) => void;
  onCompleteWithoutReceipt: (r: TradeRequest) => void;
}

const Row: React.FC<{ r: TradeRequest; children: React.ReactNode; onOpen: (r: TradeRequest) => void }> = ({ r, children, onOpen }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#FBF6E9] transition-colors duration-150">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-condensed font-bold text-navy">{r.tradeCode}</span>
        <TypeBadge request={r} />
        <StatusBadge status={r.status} requestType={r.requestType} />
      </div>
      <div className="text-[13.5px] text-navy mt-1 truncate">{r.rcaName} · {r.partnerCode} · {r.region}</div>
      {r.dateOfAction && <div className="text-[12px] text-muted">Data: {formatDateBR(r.dateOfAction)}</div>}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => onOpen(r)} aria-label="Ver detalhes" className="iconbtn"><Eye size={15} /></button>
      {children}
    </div>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; count: number; hint: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, count, hint, right, children }) => (
  <Card>
    <div className="card-head">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">{icon}{title} <span className="badge">{count}</span></h2>
        {right}
      </div>
      <p className="hint mt-1">{hint}</p>
    </div>
    <div className="divide-y divide-line">{children}</div>
  </Card>
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
    <div className="space-y-4">
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

      <Section
        title="Degustações a pagar" icon={<Wallet size={16} />} count={toPay.length}
        hint="O RCA já enviou fotos, notas e PIX. Confira os dados em detalhes antes de pagar."
        right={<span className="kpi text-lg">{formatBRL(totalToPay)}</span>}
      >
        {toPay.length === 0 && <p className="empty">Nada a pagar no momento.</p>}
        {toPay.map(r => (
          <Row key={r.id} r={r} onOpen={onOpen}>
            <span className="kpi mr-1">{formatBRL(r.totalValue)}</span>
            <button onClick={() => onMarkPaid(r)} disabled={busyId === r.id} className="btn-primary">
              {busyId === r.id ? <Loader2 className="animate-spin" size={13} /> : <DollarSign size={13} />} Marcar como pago
            </button>
          </Row>
        ))}
      </Section>

      <Section
        title="Aguardando recibo" icon={<Receipt size={16} />} count={awaitingReceipt.length}
        hint="Personalizações, eventos e ações sociais aprovados. Quando o recibo/NF chegar, anexe aqui para concluir."
      >
        {awaitingReceipt.length === 0 && <p className="empty">Nenhum recibo pendente.</p>}
        {awaitingReceipt.map(r => (
          <Row key={r.id} r={r} onOpen={onOpen}>
            <button onClick={() => pickReceipt(r)} disabled={busyId === r.id} className="btn-primary">
              {busyId === r.id ? <Loader2 className="animate-spin" size={13} /> : <Paperclip size={13} />} Anexar recibo e concluir
            </button>
            <button onClick={() => onCompleteWithoutReceipt(r)} disabled={busyId === r.id} className="btn">Concluir sem recibo</button>
          </Row>
        ))}
      </Section>

      <Card>
        <button onClick={() => setShowPaid(s => !s)} aria-expanded={showPaid} className="w-full card-head flex items-center justify-between text-left border-b-0">
          <span className="section-title flex items-center gap-2"><CheckCircle size={16} /> Pagos / concluídos <span className="badge">{paid.length}</span></span>
          <ChevronDown size={16} className={`text-muted transition-transform duration-150 ${showPaid ? 'rotate-180' : ''}`} />
        </button>
        {showPaid && (
          <div className="divide-y divide-line border-t border-line">
            {paid.length === 0 && <p className="empty">Nenhum registro.</p>}
            {paid.map(r => (
              <Row key={r.id} r={r} onOpen={onOpen}>
                {!isEventLike(r) && <span className="kpi">{formatBRL(r.totalValue)}</span>}
              </Row>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
