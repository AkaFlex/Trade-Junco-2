import { TradeRequest, PaymentInfo } from '../../types';
import { REQUEST_TYPE_LABELS, typeOf, isEventLike, formatDateBR } from './shared';
import { todayLocal } from '../../utils/date';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando Aprovação',
  approved: 'Em Execução',
  rejected: 'Recusado',
  completed: 'Aguardando Pagamento',
  paid: 'Pago / Finalizado',
  blocked_volume: 'Bloqueado (Volume)',
  expired: 'Vencido / Expirado',
};

const statusLabel = (r: TradeRequest) => {
  if (isEventLike(r) && r.status === 'completed') return 'Aprovado – aguardando recibo';
  if (isEventLike(r) && r.status === 'paid') return 'Concluído';
  return STATUS_LABELS[r.status] ?? r.status;
};

const COLUMNS: [string, (r: TradeRequest, p: PaymentInfo | null) => unknown][] = [
  ['Tipo', r => REQUEST_TYPE_LABELS[typeOf(r)]],
  ['ID (Firestore)', r => r.id],
  ['Código Único', r => r.tradeCode],
  ['RCA / Solicitante', r => r.rcaName],
  ['E-mail', r => r.rcaEmail],
  ['Telefone / Contato', r => r.rcaPhone],
  ['Cód. Parceiro', r => r.partnerCode],
  ['Região', r => r.region],
  ['Cidade', r => r.city],
  ['Data do Pedido', r => formatDateBR(r.orderDate)],
  ['Data da Ação / Evento', r => formatDateBR(r.dateOfAction)],
  ['Dias', r => r.days],
  ['Valor (R$)', r => Number(r.totalValue).toFixed(2).replace('.', ',')],
  ['Status', r => statusLabel(r)],
  ['Motivo Recusa / Vencimento', r => r.rejectionReason],
  ['Chave PIX', (_, p) => p?.pixKey],
  ['Titular PIX', (_, p) => p?.pixHolder],
  ['CPF PIX', (_, p) => p?.pixCpf],
  ['Criado em', r => new Date(r.createdAt).toLocaleString('pt-BR')],
  ['Última alteração por', r => r.updatedBy],
  ['Espaço (Person.)', r => r.customizationSpace],
  ['Categoria de Produtos', r => r.brandCategory],
  ['Localização na Loja', r => r.storeLocation],
  ['Fluxo de Pessoas', r => r.footTraffic],
  ['Fornecedor Indicado', r => r.supplierIndication],
  ['Gráfica Atribuída (ADM)', r => r.adminAssignedSupplier],
  ['Tipo de Evento', r => (r.eventCategory === 'esportivo' ? 'Esportivo' : r.eventCategory === 'comercial' ? 'Comercial' : '')],
  ['Instituição', r => r.institutionName],
  ['Horário', r => r.eventTime],
  ['Local do Evento', r => r.eventLocation],
  ['Público Esperado', r => r.expectedAudience],
  ['Finalidade', r => r.eventPurpose],
  ['Participação Junco', r => r.juncoParticipation],
  ['Data Sazonal', r => (r.seasonalDate === 'sim' ? `Sim – ${r.seasonalDateDescription || ''}` : r.seasonalDate === 'nao' ? 'Não' : '')],
  ['Qtd. Itens', r => r.itemQuantity],
  ['Produto Desejado', r => r.desiredProduct],
  ['Anexo (Mídia Kit / Ofício)', r => r.mediaKitUrl || r.actionOfficeUrl],
  ['Fotos', r => [...(r.spacePhotoUrls || [r.spacePhotoUrl]), ...(r.photoUrls || [])].filter(Boolean).join(' | ')],
  ['Comprovantes / Recibos', r => (r.receiptUrls || []).join(' | ')],
];

const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;

export const exportToCSV = (requests: TradeRequest[], payments: Record<string, PaymentInfo | null>, exportedBy: string) => {
  const rows = requests.map(r => COLUMNS.map(([, get]) => escape(get(r, payments[r.id] ?? null))).join(';'));
  const header = COLUMNS.map(([h]) => escape(h)).join(';');
  const footer = escape(`Exportado por ${exportedBy} em ${new Date().toLocaleString('pt-BR')}`);
  const csv = '﻿' + [header, ...rows, '', footer].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `junco-trade-${todayLocal()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
