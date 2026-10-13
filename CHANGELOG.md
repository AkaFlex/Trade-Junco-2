# CHANGELOG – Portal Trade (Junco Trade)

## Links oficiais
- Site (produção): https://akaflex.github.io/Trade-Junco-2/
- Repositório: github.com/AkaFlex/Trade-Junco-2 (push em `main` publica via GitHub Actions → GitHub Pages)
- Firebase: projeto `app-trade-junco` (regras do Firestore publicadas **manualmente** no console)
- Uploads: Cloudinary (cloud …i6m, preset unsigned …dhb)

## Níveis
N1 Crítica · N2 Maior · N3 Menor · N4 Correção · N5 Documentação

---

## [2.0.0] – 2026-10-13 · N1 Crítica
**Deploy:** pendente (aguarda confirmação + backup) · **Autor:** Mateus Silva (com Claude)
**Resumo:** fechamento do banco sem exigir login do RCA. Regras do Firestore reescritas: listagem de `requests` só para o gestor; criação validada (dias 1–5, valor = dias × 150, antecedência, campos proibidos); alteração pública limitada a "+1 relatório de Sell-Out", anexos e finalização do reembolso; `showcase` versionado; lista de gestores corrigida (`sousa`). Acesso público passa a ser só por código: novo índice `codes/{código}` e código TJ de 10 caracteres gerado com `crypto`. PIX/CPF movidos para `requests/{id}/private/payment` (leitura só do gestor). Escritas do gestor gravam `updatedBy/updatedAt`. "Minhas Solicitações" busca só por código. Botões novos no painel: **Backup** (JSON) e **Migrar segurança**.
**Arquivos:** firestore.rules, types.ts, services/tradeService.ts, services/tradeCode.ts (novo), services/maintenanceService.ts (novo), components/AdminPanel.tsx, RCAPanel.tsx, ExecutionView.tsx, RequestWizard.tsx, CustomizationWizard.tsx, EventsWizard.tsx
**Impacto em dados:** Sim – nova coleção `codes`; subcoleção `requests/{id}/private/payment`; campos `pixKey/pixHolder/pixCpf` saem do documento principal (após "Migrar segurança"); novos campos `createdAtServer`, `updatedBy`, `updatedAt`; e-mail do RCA gravado em minúsculas.
**Testes feitos:** `tsc` e `vite build` ok; busca por código (maiúsc./minúsc.) no navegador com as regras atuais; sem erros no console. Regras não testadas em emulador (sem Java) – roteiro no Rules Playground do console.
**Pendências/Riscos:** ordem de publicação: (1) push do código, (2) Backup, (3) colar as regras no console, (4) clicar "Migrar segurança" logo em seguida. Entre (3) e (4), códigos antigos não são encontrados pelo público. Avisar os RCAs que a busca por e-mail saiu.

## [1.0.0] – 2026-10-13 · N5 Documentação
**Deploy:** — (sem deploy) · **Autor:** Mateus Silva (com Claude)
**Resumo:** criação do CHANGELOG (padrão P4) com o histórico das alterações anteriores, registradas abaixo de forma retroativa.
**Arquivos:** CHANGELOG.md
**Impacto em dados:** Não
**Testes feitos:** —
**Pendências/Riscos:** itens do AUDIT.md em andamento.

## [0.4.0] – 2026-09-24 · N3 Menor (retroativo)
**Deploy:** commit b06555f · **Resumo:** logo da Junco (fundo removido) no lugar do marcador do topo.
**Arquivos:** App.tsx, assets/junco-logo.png, vite-env.d.ts · **Impacto em dados:** Não

## [0.3.0] – 2026-09-23 · N2 Maior (retroativo)
**Deploy:** commits c364183, 1bd2d5d, 73636ca · **Resumo:** nova categoria "Solicitação de Eventos" (Eventos / Ação Social) com anexo obrigatório via Cloudinary e alerta "Atrasado" (3 dias) no painel.
**Arquivos:** EventsWizard.tsx, eventAttachmentService.ts, AdminPanel.tsx, RCAPanel.tsx, StatusBadge.tsx, HomeMenu.tsx, App.tsx, types.ts
**Impacto em dados:** Sim – novos `requestType` (`evento`, `acao_social`) e campos opcionais em `requests`.

## [0.2.1] – 2026-07-13 · N4 Correção (retroativo)
**Deploy:** commit ef76db7 · **Resumo:** aba Produtos exibia a tabela de vencidos.
**Arquivos:** AdminPanel.tsx · **Impacto em dados:** Não

## [0.2.0] – 2026-07-13 · N2 Maior (retroativo)
**Deploy:** commit eb4a4f8 · **Resumo:** lista de produtos do Sell-Out gerenciada pelo admin (coleção `products`).
**Arquivos:** AdminPanel.tsx, PromoterPanel.tsx, productsService.ts, types.ts, firestore.rules
**Impacto em dados:** Sim – nova coleção `products`.
