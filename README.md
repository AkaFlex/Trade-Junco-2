# Portal Trade (Junco Trade)

Portal interno de Trade Marketing da Junco: solicitações de degustação, personalização de espaço, eventos e ações sociais; relatório de Sell-Out da degustadora; reembolso do RCA; painel do gestor (aprovações, financeiro, orçamentos e produtos).

- **Produção:** https://akaflex.github.io/Trade-Junco-2/
- **Histórico de alterações:** [CHANGELOG.md](CHANGELOG.md) (obrigatório registrar toda alteração, níveis N1–N5)

## Stack

React 18 + TypeScript + Vite + Tailwind (compilado) · Firebase Auth/Firestore (projeto `app-trade-junco`) · uploads via Cloudinary (preset *unsigned*).

## Rodar localmente

Pré-requisito: Node.js 20.

```bash
npm ci
npm run dev
```

Abre em `http://localhost:5173/Trade-Junco-2/`. **Atenção:** o app aponta para o Firebase de produção (não há ambiente de teste); evite criar solicitações de teste.

Verificação antes de publicar:

```bash
npx tsc --noEmit
npm run build
npm test
```

`npm test` roda o Playwright (tests/) contra o app em `--mode test`, com Firebase, login e Cloudinary **simulados** (nunca toca em produção). Usa o Chrome instalado (`PW_CHANNEL=msedge npm test` para o Edge). Cobre criar → aprovar → Sell-Out → reembolso → pagar e a auditoria axe-core (desktop e 375 px).

## Publicar

- **Site:** push em `main` → GitHub Actions (`.github/workflows/deploy.yml`) builda e publica no GitHub Pages. Produção pede confirmação antes do push (padrão da empresa).
- **Regras do Firestore:** **não** são publicadas pelo CI. Depois de alterar `firestore.rules`, copie o arquivo inteiro em Firebase Console → Firestore → Regras → Publicar. Registre no CHANGELOG.

## Acesso e segurança

- **Gestores:** login (Firebase Auth). A lista de e-mails existe em dois lugares que devem ser iguais: `ADMIN_EMAILS` em `types.ts` e `isAdmin()` em `firestore.rules`.
- **RCA, degustadora e solicitantes:** sem login. O acesso a uma solicitação é feito pelo **código TJ** (índice `codes/{código}`); listar a coleção é exclusivo do gestor.
- PIX/CPF ficam em `requests/{id}/private/payment`, legível só pelo gestor.
- O painel tem **Backup** (JSON de todas as coleções) e **Migrar segurança** (cria o índice de códigos e protege PIX antigos; idempotente).

## Estrutura

| Pasta/arquivo | Conteúdo |
|---|---|
| `components/` | Telas públicas (wizards, Sell-Out, reembolso, vitrine) |
| `components/admin/` | Painel do gestor (abas, modal de detalhes, CSV, orçamento) |
| `components/shared/` | Toast, ConfirmModal, OptionSelect, StatusBadge |
| `services/` | Acesso ao Firestore, upload (Cloudinary), código TJ, manutenção |
| `config.ts` | Regras de negócio (valor/dia, limites, prazos) |
| `utils/` | Datas no fuso local e rotas por hash (`#/sellout?code=...`) |
| `firestore.rules` | Regras de segurança (publicação manual) |
