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
  <section className="border border-line rounded-md p-4">
    <h4 className="font-condensed font-bold uppercase tracking-wide text-navy mb-3 flex items-center gap-2">{icon}{title}</h4>
    {children}
  </section>
);

const Links: React.FC<{ urls: string[]; label: string }> = ({ urls, label }) =>
  urls.length === 0 ? <p className="text-sm text-muted">Nenhum arquivo.</p> : (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a key={url + i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-paper border border-line px-3 py-1.5 rounded text-sm text-blue-text hover:underline">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="details-title" className="bg-white rounded-md shadow-modal w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-navy px-5 py-3 flex justify-between items-center text-white sticky top-0 z-10">
          <h3 id="details-title" className="font-condensed font-bold uppercase tracking-wide flex items-center gap-2"><FileText size={18} /> Detalhes da solicitação</h3>
          <button onClick={onClose} aria-label="Fechar" className="hover:bg-white/10 p-1 rounded"><X /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-condensed font-bold text-purple-junco text-xl">{r.tradeCode}</span>
                <TypeBadge request={r} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Parceiro: {r.partnerCode}</h2>
              <p className="text-muted text-sm">{r.region}{r.city ? ` · ${r.city}` : ''}</p>
              <div className="mt-2"><StatusBadge status={r.status} overdue={isRequestOverdue(r)} requestType={r.requestType} /></div>
              {r.rejectionReason && <p className="text-sm text-gray-700 mt-2"><strong>Motivo:</strong> {r.rejectionReason}</p>}
            </div>
            {!isEventLike(r) && (
              <div className="text-right">
                <div className="text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted">Valor aprovado</div>
                <div className="text-3xl font-condensed font-bold text-navy">{formatBRL(r.totalValue)}</div>
                <div className="text-xs text-muted">{r.days} dia(s) · ação em {formatDateBR(r.dateOfAction)}</div>
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
                  <span className="block text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted mb-2">Fotos do espaço</span>
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
                <h5 className="text-sm font-semibold text-navy flex items-center gap-2 mb-1"><Shield size={14} /> Controle interno (só gestão)</h5>
                <p className="text-xs text-muted mb-2">Gráfica/fornecedor que vai produzir. O RCA não vê este campo.</p>
                {editingSupplier ? (
                  <div className="flex flex-col md:flex-row gap-2">
                    <input aria-label="Gráfica atribuída" className="flex-1 border border-line rounded-md p-2.5" placeholder="Ex: Gráfica Expressa da Cidade" value={supplier} onChange={e => setSupplier(e.target.value)} />
                    <button onClick={async () => { await onSaveSupplier(r, supplier); setEditingSupplier(false); }} className="bg-navy text-white px-5 py-2.5 rounded-md font-condensed font-semibold uppercase tracking-wide text-sm">Salvar</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-paper border border-line rounded-md p-3">
                    <span className="font-semibold text-navy">{r.adminAssignedSupplier}</span>
                    <button onClick={() => setEditingSupplier(true)} className="text-xs font-bold text-navy border border-line bg-white rounded px-3 py-1.5">Editar</button>
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
              <p className="text-sm text-gray-800 italic">"{r.justification}"</p>
            </Block>
          )}

          {(!isEventLike(r) || receipts.length > 0) && (
            <Block title={isEventLike(r) ? 'Recibos' : 'Fotos e comprovantes'} icon={<Camera size={16} />}>
              <div className="grid md:grid-cols-2 gap-4">
                {!isEventLike(r) && (
                  <div>
                    <span className="block text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted mb-2">Fotos da ação</span>
                    <Links urls={photos} label="Foto" />
                  </div>
                )}
                <div>
                  <span className="block text-[11px] font-condensed font-semibold uppercase tracking-wide text-muted mb-2">{isEventLike(r) ? 'Recibos / NF' : 'Comprovantes'}</span>
                  <Links urls={receipts} label="Arquivo" />
                </div>
              </div>
            </Block>
          )}

          {r.salesReports && r.salesReports.length > 0 && (
            <Block title={`Relatórios de Sell-Out (${r.salesReports.length}/${r.days})`} icon={<ShoppingBag size={16} />}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted text-left border-b border-line">
                      <th className="pb-2">Data</th><th className="pb-2">Vendedor</th><th className="pb-2">Loja</th><th className="pb-2">Produtos vendidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.salesReports.map((rep, idx) => (
                      <tr key={idx}>
                        <td className="py-2 align-top">{new Date(rep.date).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 align-top">{rep.sellerName}</td>
                        <td className="py-2 align-top">{rep.storeName}</td>
                        <td className="py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {rep.products.filter(p => p.qty > 0).map((p, i) => (
                              <span key={i} className="bg-paper border border-line px-2 py-0.5 rounded text-[10px]">{p.name}: <strong className="text-pink-junco">{p.qty}</strong></span>
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

          {r.updatedBy && <p className="text-xs text-muted text-right">Última alteração por {r.updatedBy}</p>}
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end">
          <button onClick={onClose} className="bg-navy text-white px-5 py-2 rounded-md font-condensed font-semibold uppercase tracking-wide text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
};
