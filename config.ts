// Regras de negócio centralizadas. Valores que também existem em firestore.rules
// (valor/dia, limite de dias, antecedência) precisam ser alterados nos dois lugares.

export const DAILY_RATE = 150;              // R$ por dia de degustação
export const MAX_ACTION_DAYS = 5;
export const MIN_LEAD_DAYS = 7;             // antecedência mínima da ação
export const MIN_DOCERIA_VOLUME = 5000;     // R$ comprados em Doceria no mês
export const RESPONSE_SLA_DAYS = 3;         // prazo de resposta do gestor (Eventos/Ação Social)
export const REIMBURSEMENT_GRACE_DAYS = 10; // dias após o fim da ação para enviar o reembolso
export const MIN_CUSTOMIZATION_PHOTOS = 2;

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const FIRESTORE_BATCH_LIMIT = 450;   // Firestore aceita até 500 operações por lote
