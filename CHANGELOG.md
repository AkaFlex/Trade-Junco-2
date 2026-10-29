# CHANGELOG – Portal Trade (Junco Trade)

## Links oficiais
- Site (produção): https://akaflex.github.io/Trade-Junco-2/
- Repositório: github.com/AkaFlex/Trade-Junco-2 (push em `main` publica via GitHub Actions → GitHub Pages)
- Firebase: projeto `app-trade-junco` (regras do Firestore publicadas **manualmente** no console)
- Uploads: Cloudinary (cloud …i6m, preset unsigned …dhb)

## Níveis
N1 Crítica · N2 Maior · N3 Menor · N4 Correção · N5 Documentação

---

## [2.2.0] – 2026-10-29 · N3 Menor
**Deploy:** ainda não publicado (commit local; push em `main` publica via GitHub Actions e pede confirmação do dono) · **Autor:** Mateus Silva (com Claude)
**Resumo:** (1) **Testes automáticos Playwright** do fluxo criar → aprovar → Sell-Out → reembolso → pagar e auditoria **axe-core** (desktop e 375 px), com Firebase/Auth/Cloudinary simulados (`npm test`); (2) tela **"Confira suas respostas"** antes de enviar nas Degustação, Personalização e Eventos/Ação Social (botão "Alterar respostas" mantém os dados); (3) **paginação** (25 por página) na lista de Solicitações e nas listas do Financeiro; (4) **atalhos de teclado** na fila do gestor (J/K, A, R, D, /) com legenda visível; (5) **QR do link do Sell-Out** na tela de sucesso da degustação (qrcode-generator, MIT, carregado sob demanda); (6) `transition-all` (3) trocado por propriedades específicas; `text-wrap: balance` nos títulos; (7) acessibilidade: botões Início/Sair com nome acessível no celular.
**Arquivos:** components/shared/Wizard.tsx, shared/Pagination.tsx (novo), shared/LinkQR.tsx (novo), shared/Toast.tsx, RequestWizard.tsx, CustomizationWizard.tsx, EventsWizard.tsx, admin/RequestsTab.tsx, admin/FinanceTab.tsx, ExecutionView.tsx, PromoterPanel.tsx, App.tsx, index.css, vite.config.ts (alias de teste só em `--mode test`), playwright.config.ts, tests/*, package.json, package-lock.json, README.md
**Impacto em dados:** Não. Nenhuma regra de negócio, campo ou `firestore.rules` alterados.
**Testes feitos:** `tsc --noEmit` e `npm run build` ok; `npm test` (4 testes) ok.
**Pendências/Riscos:** Frappe Gantt e minigráficos não aplicados (ver nota). Painel com login real e Firestore real precisam ser conferidos pelo gestor após publicar.

## [2.1.1] – 2026-10-14 · N3 Menor
**Deploy:** commit 0981da4 (2026-10-14) · **Autor:** Mateus Silva (com Claude)
**Resumo:** migração visual completa para o design system Junco (PADROES-JUNCO.md §3, referência Captação de Tendências), em todas as telas: cabeçalho branco com a faixa arco-íris de 6px; títulos Barlow Semi Condensed em maiúsculas; botões padrão/primário (navy)/perigoso (rosa) com raio 4px; inputs 13,5px; cards com borda 1px e raio 6px, sem sombras pesadas nem gradientes; badges em pílula (raio 20px) com cores semânticas (ok, erro, info, destaque); tabela com cabeçalho #F6F5F1 e borda navy, hover #FBF6E9; abas com sublinhado laranja e contador amarelo; modais com overlay navy, animação curta, Esc e foco; toast de erro fica até ser fechado (máx. 3); KPIs com números que contam até o valor; vitrine sem autoplay (grade paginada); CSS de acessibilidade (foco visível, movimento reduzido, alvos de 44px no toque, seleção amarela). Classes do padrão centralizadas em `index.css` (`.btn`, `.card`, `.badge`, `.input`, `.table`, `.tab`...).
**Arquivos:** index.css, App.tsx, HomeMenu.tsx, TradeShowcase.tsx, RequestWizard.tsx, CustomizationWizard.tsx, EventsWizard.tsx, PromoterPanel.tsx, RCAPanel.tsx, ExecutionView.tsx, AdminPanel.tsx, admin/* (shared, OverviewTab, RequestsTab, FinanceTab, SettingsTab, RequestDetailsModal), shared/StatusBadge.tsx, shared/ConfirmModal.tsx, shared/OptionSelect.tsx, shared/Toast.tsx, shared/Wizard.tsx (novo), shared/CountUp.tsx (novo)
**Impacto em dados:** Não
**Testes feitos:** `tsc --strict` e build ok; navegador: home, formulário de degustação, Minhas solicitações (busca real), painel com dados fictícios (Visão Geral e Solicitações); console sem erros.
**Pendências/Riscos:** nenhuma regra de negócio alterada.

## [2.1.0] – 2026-10-13 · N2 Maior
**Deploy:** commit acb0da2 (2026-10-13) · **Autor:** Mateus Silva (com Claude)
**Resumo:**
- **Painel do gestor redesenhado** (pedido da usuária): de 9 abas para 4 – Visão Geral, Solicitações (lista única com **busca global** em todas as situações + filtros por situação e tipo), Financeiro (degustações a pagar + Personalização/Evento/Ação Social "aguardando recibo", com "Anexar recibo e concluir") e Configurações (Orçamentos e Produtos). Botão **Reabrir** para vencidos.
- **Personalização** (pedido da usuária): novos campos *Localização na loja* e *Fluxo de pessoas* (escolha única), mínimo de **2 fotos**, rótulos "Categoria de Produtos no Espaço" e "fornecedor de comunicação visual".
- **Vencimento** passa a ser por prazo (fim da ação + 10 dias sem reembolso), não mais pela virada do mês; datas sempre no fuso local.
- **Uploads** unificados no Cloudinary com validação de tipo/tamanho (ImgBB removido); comprovante de reembolso aceita **PDF**; falha de um arquivo não trava mais a tela.
- Eventos/Ação Social pedem **e-mail** e **região**; orçamento não é checado para itens de valor zero; orçamento soma aprovado + aguardando pagamento + pago, por mês da ação.
- Dias de ação limitados a 1–5 inteiros; Sell-Out confere no servidor o limite de relatórios.
- **Padrão Junco (P2/P3):** modal de confirmação e seletor personalizados (sem `alert/confirm/<select>` nativos), Tailwind compilado (sem CDN), fontes Barlow, paleta/raios/toast navy, barra superior navy.
- **Rotas** no endereço (`#/sellout?code=...`): F5 e Voltar funcionam; botão "Copiar link do Sell-Out" para a degustadora. Telas pesadas carregadas sob demanda (bundle inicial 1,19 MB → 659 KB).
- Registro de exportações/backups (coleção `logs`), aviso para conta sem perfil de gestor, acessibilidade básica (rótulos, Esc, `role=dialog`, carrossel pausável), TypeScript `strict`, `npm ci` no CI, README novo.
**Arquivos:** components/admin/* (novos: shared, csv, budget, OverviewTab, RequestsTab, FinanceTab, SettingsTab, RequestDetailsModal), AdminPanel.tsx, CustomizationWizard.tsx, EventsWizard.tsx, RequestWizard.tsx, ExecutionView.tsx, PromoterPanel.tsx, RCAPanel.tsx, TradeShowcase.tsx, HomeMenu.tsx, App.tsx, shared/ConfirmModal.tsx, shared/OptionSelect.tsx, shared/StatusBadge.tsx, shared/Toast.tsx, services/uploadService.ts (substitui eventAttachmentService.ts), services/showcaseService.ts, services/tradeService.ts, services/maintenanceService.ts, utils/date.ts, utils/route.ts, config.ts, types.ts, firestore.rules, index.html, index.css, index.tsx, tailwind.config.js, postcss.config.js, tsconfig.json, package.json, package-lock.json, .github/workflows/deploy.yml, public/favicon.png, firebaseConfig.ts, README.md
**Impacto em dados:** Sim – novos campos `storeLocation` e `footTraffic` em personalizações; nova coleção `logs`; vencimento automático grava motivo com a data-limite e `updatedBy`. Nenhum dado existente é alterado.
**Testes feitos:** `tsc --strict` e `vite build` ok; navegador: home, Personalização (campos novos, seletor, mínimo de fotos), link do Sell-Out com código, Voltar/F5, painel sem login; abas Solicitações/Financeiro e modal de confirmação renderizados com dados fictícios (sem gravar em produção). Upload Cloudinary já validado em 2026-09-23.
**Pendências/Riscos:** colar o `firestore.rules` atualizado no console (exige 2 fotos na personalização, coleção `logs`). Painel com login real precisa ser conferido pelo gestor.

## [2.0.0] – 2026-10-13 · N1 Crítica
**Deploy:** commit 9277b93 (2026-10-13) · **Autor:** Mateus Silva (com Claude)
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
