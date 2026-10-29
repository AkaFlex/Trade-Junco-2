import { expect, type Page } from '@playwright/test';

// Dados de teste: tudo roda contra o Firestore/Auth FALSOS (tests/fakes), nunca contra produção.
export const ADMIN_EMAIL = 'mateus.silva@junco.com.br';
export const FAKE_PASSWORD = 'senha-de-teste'; // aceita só pelo Auth falso

export const isoPlusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

/** Banco falso começa com 2 produtos do Sell-Out; Cloudinary é simulado. */
export const setupMocks = async (page: Page) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('__fake_fs__')) return;
    localStorage.setItem('__fake_fs__', JSON.stringify({
      'products/p1': { name: 'Bala de Coco - 400g', order: 1, active: true },
      'products/p2': { name: 'Granolas - 250g', order: 2, active: true },
    }));
  });
  await page.route('https://api.cloudinary.com/**', route =>
    route.fulfill({ json: { secure_url: 'https://res.cloudinary.com/teste/image/upload/arquivo-de-teste.png' } }));
  await page.route('https://res.cloudinary.com/**', route =>
    route.fulfill({ contentType: 'image/png', body: PNG_1PX }));
};

export const loginAdmin = async (page: Page) => {
  await page.getByRole('button', { name: /Gestor/ }).click();
  await page.getByLabel('E-mail corporativo').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(FAKE_PASSWORD);
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await expect(page.getByRole('button', { name: /Sair/ })).toBeVisible();
};

export const goAdmin = async (page: Page) => {
  await page.getByRole('button', { name: /Acessar painel do gestor/ }).click();
  await expect(page.getByRole('heading', { name: 'Painel de gestão' })).toBeVisible();
};

/** Preenche a degustação e clica em "Revisar e finalizar" (abre a tela de revisão). */
export const fillTasting = async (page: Page, over: Partial<{ name: string; days: number }> = {}) => {
  await page.getByRole('button', { name: /Solicitar degustação/ }).click();
  await page.getByRole('button', { name: 'Sim', exact: true }).click();
  await page.getByLabel('Nome completo *').fill(over.name ?? 'Maria Teste');
  await page.getByLabel('E-mail *').fill('maria.teste@exemplo.com');
  await page.getByLabel('WhatsApp *').fill('11987654321');
  await page.getByRole('button', { name: 'Sim', exact: true }).click();
  await page.getByLabel('Código do parceiro *').fill('123456');
  await page.getByLabel('Data do pedido de doces *').fill(isoPlusDays(-1));
  await page.getByLabel('Data prevista da ação *').fill(isoPlusDays(10));
  if (over.days && over.days > 1) {
    await page.getByLabel('Dias de ação *').fill(String(over.days));
    await page.getByLabel('Justificativa (mais de 1 dia) *').fill('Ação em feriado prolongado.');
  }
  await page.getByRole('button', { name: 'Revisar e finalizar' }).click();
};
