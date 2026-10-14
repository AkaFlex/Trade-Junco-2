import React, { useEffect, useState } from 'react';
import { X, FileText, User, Wallet, AlertTriangle, ShoppingBag, Shield, PartyPopper, HeartHandshake, Camera, Eye } from 'lucide-react';
import { TradeRequest, PaymentInfo } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Field, TypeBadge, isEventLike, isRequestOverdue, formatBRL, formatDateBR } from './shared';

interface Props {
  request: TradeRequest;
  payment: PaymentInfo | null;
  onClose: () => void;
  onSaveSupplier: (r: TradeRequest, supplier: string) => Promise<void>;
}

const Block: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="card-inner bg-white p-4">
    <h4 className="section-title mb-3 flex items-center gap-2">{icon}{title}</h4>
    {children}
  </section>
);

const Links: React.FC<{ urls: string[]; label: string }> = ({ urls, label }) =>
  urls.length === 0 ? <p className="text-[13px] text-muted">Nenhum arquivo.</p> : (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a key={url + i} href={url} target="_blank" rel="noreferrer" className="iconbtn gap-1.5 text-[13px] text-blue-text">
          <Eye size={14} /> {label} {i + 1}
        </a>
      ))}
    </div>
  );

export const RequestDetailsModal: React.FC<Props> = ({ request: r, payment, onClose, onSaveSupplier }) => {
  const [supplier, setSupplier] = useState(r.adminAssignedSupplier || '');
  const [editingSupplier, setEditingSupplier] = useState(!r.adminAssignedSupplier);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const spacePhotos = (r.spacePhotoUrls || [r.spacePhotoUrl]).filter(Boolean) as string[];
  const photos = (r.photoUrls || [r.photoUrl]).filter(Boolean) as string[];
  const receipts = (r.receiptUrls || [r.receiptUrl]).filter(Boolean) as string[];

  return (
    <div className="overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="details-title" className="modal max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="modal-head sticky top-0 bg-white z-10 rounded-t-md">
          <h2 id="details-title" className="flex items-center gap-2"><FileText size={17} /> Detalhes da solicitação</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-navy"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-condensed font-black text-navy text-xl">{r.tradeCode}</span>
                <TypeBadge request={r} />
              </div>
              <p className="text-[16px] font-semibold text-navy">Parceiro: {r.partnerCode}</p>
              <p className="text-muted text-[13px]">{r.region}{r.city ? ` · ${r.city}` : ''}</p>
              <div className="mt-2"><StatusBadge status={r.status} overdue={isRequestOverdue(r)} requestType={r.requestType} /></div>
              {r.rejectionReason && <div className={`${r.status === 'rejected' ? 'notice-error' : 'notice'} mt-2`}><strong>Motivo:</strong> {r.rejectionReason}</div>}
            </div>
            {!isEventLike(r) && (
              <div className="text-right">
                <div className="label mb-0">Valor aprovado</div>
                <div className="kpi text-3xl">{formatBRL(r.totalValue)}</div>
                <div className="text-[12px] text-muted">{r.days} dia(s) · ação em {formatDateBR(r.dateOfAction)}</div>
              </div>
            )}
          </div>

          <Block title="Solicitante" icon={<User size={16} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Nome">{r.rcaName}</Field>
              <Field label="E-mail">{r.rcaEmail}</Field>
              <Field label="Telefone / contato">{r.rcaPhone}</Field>
            </div>
          </Block>

          {r.requestType === 'personalizacao' && (
            <Block title="Personalização" icon={<ShoppingBag size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Espaço a ser personalizado">{r.customizationSpace}</Field>
                <Field label="Categoria de produtos no espaço">{r.brandCategory}</Field>
                <Field label="Localização na loja">{r.storeLocation}</Field>
                <Field label="Fluxo de pessoas">{r.footTraffic}</Field>
                <Field label="Fornecedor de comunicação visual indicado">{r.supplierIndication}</Field>
              </div>
              {spacePhotos.length > 0 && (
                <div className="mt-4">
                  <span className="label mb-2">Fotos do espaço</span>
                  <div className="flex flex-wrap gap-3">
                    {spacePhotos.map((url, i) => (
                      <a key={url + i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} className="h-28 w-28 object-cover rounded border border-line" alt={`Foto do espaço ${i + 1}`} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-line">
                <h5 className="section-title text-[13px] flex items-center gap-2 mb-1"><Shield size={14} /> Controle interno (só gestão)</h5>
                <p className="hint mb-2">Gráfica/fornecedor que vai produzir. O RCA não vê este campo.</p>
                {editingSupplier ? (
                  <div className="flex flex-col md:flex-row gap-2">
                    <input aria-label="Gráfica atribuída" className="input flex-1" placeholder="Ex: Gráfica Expressa da Cidade" value={supplier} onChange={e => setSupplier(e.target.value)} />
                    <button onClick={async () => { await onSaveSupplier(r, supplier); setEditingSupplier(false); }} className="btn-primary">Salvar</button>
                  </div>
                ) : (
                  <div className="card-inner flex items-center justify-between p-3">
                    <span className="font-semibold text-navy">{r.adminAssignedSupplier}</span>
                    <button onClick={() => setEditingSupplier(true)} className="btn">Editar</button>
                  </div>
                )}
              </div>
            </Block>
          )}

          {r.requestType === 'evento' && (
            <Block title="Evento" icon={<PartyPopper size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Tipo">{r.eventCategory === 'esportivo' ? 'Evento esportivo' : r.eventCategory === 'comercial' ? 'Evento comercial' : ''}</Field>
                <Field label="Instituição / empresa">{r.institutionName}</Field>
                <Field label="Dia do evento">{formatDateBR(r.dateOfAction)}</Field>
                <Field label="Horário">{r.eventTime}</Field>
                <Field label="Local">{r.eventLocation}</Field>
                <Field label="Público esperado">{r.expectedAudience}</Field>
                <Field label="Finalidade" full>{r.eventPurpose}</Field>
                <Field label="Participação da Junco" full>{r.juncoParticipation}</Field>
              </div>
              {r.mediaKitUrl && <div className="mt-3"><Links urls={[r.mediaKitUrl]} label="Mídia kit" /></div>}
            </Block>
          )}

          {r.requestType === 'acao_social' && (
            <Block title="Ação social" icon={<HeartHandshake size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Data sazonal?">{r.seasonalDate === 'sim' ? `Sim — ${r.seasonalDateDescription || ''}` : 'Não'}</Field>
                <Field label="Dia do evento">{formatDateBR(r.dateOfAction)}</Field>
                <Field label="Horário">{r.eventTime}</Field>
                <Field label="Local">{r.eventLocation}</Field>
                <Field label="Quantidade de itens">{r.itemQuantity}</Field>
                <Field label="Produto desejado">{r.desiredProduct}</Field>
                <Field label="Finalidade" full>{r.eventPurpose}</Field>
              </div>
              {r.actionOfficeUrl && <div className="mt-3"><Links urls={[r.actionOfficeUrl]} label="Ofício da ação" /></div>}
            </Block>
          )}

          {payment && (
            <Block title="Dados para pagamento (PIX)" icon={<Wallet size={16} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Chave PIX">{payment.pixKey}</Field>
                <Field label="Titular">{payment.pixHolder}</Field>
                <Field label="CPF do titular">{payment.pixCpf}</Field>
              </div>
            </Block>
          )}

          {r.days > 1 && r.justification && (
            <Block title="Justificativa (+1 dia)" icon={<AlertTriangle size={16} />}>
              <p className="text-[13.5px] italic">"{r.justification}"</p>
            </Block>
          )}

          {(!isEventLike(r) || receipts.length > 0) && (
            <Block title={isEventLike(r) ? 'Recibos' : 'Fotos e comprovantes'} icon={<Camera size={16} />}>
              <div className="grid md:grid-cols-2 gap-4">
                {!isEventLike(r) && (
                  <div>
                    <span className="label mb-2">Fotos da ação</span>
                    <Links urls={photos} label="Foto" />
                  </div>
                )}
                <div>
                  <span className="label mb-2">{isEventLike(r) ? 'Recibos / NF' : 'Comprovantes'}</span>
                  <Links urls={receipts} label="Arquivo" />
                </div>
              </div>
            </Block>
          )}

          {r.salesReports && r.salesReports.length > 0 && (
            <Block title={`Relatórios de Sell-Out (${r.salesReports.length}/${r.days})`} icon={<ShoppingBag size={16} />}>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th><th>Vendedor</th><th>Loja</th><th>Produtos vendidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.salesReports.map((rep, idx) => (
                      <tr key={idx}>
                        <td>{new Date(rep.date).toLocaleDateString('pt-BR')}</td>
                        <td>{rep.sellerName}</td>
                        <td>{rep.storeName}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {rep.products.filter(p => p.qty > 0).map((p, i) => (
                              <span key={i} className="badge">{p.name}: <strong className="text-navy">{p.qty}</strong></span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>
          )}

          {r.updatedBy && <p className="text-[12px] text-muted text-right">Última alteração por {r.updatedBy}</p>}
        </div>

        <div className="modal-foot">
          <button onClick={onClose} className="btn-primary">Fechar</button>
        </div>
      </div>
    </div>
  );
};
