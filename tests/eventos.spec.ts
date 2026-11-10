import { test, expect } from '@playwright/test';
import { setupMocks, loginAdmin, goAdmin, isoPlusDays, PNG_1PX } from './helpers';

// Eventos/Ação Social: campo Cidade obrigatório e situação "Em análise" (tira o selo "Atrasado").
const CODE = 'TJ-EVENTO0001';
const ANTIGA = Date.now() - 4 * 24 * 60 * 60 * 1000; // 4 dias: passou do prazo de 3 dias

test('Eventos exige Cidade e ela aparece em "Confira suas respostas"', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', e => erros.push(e.message));
  await setupMocks(page);
  await page.goto('./');

  await page.getByRole('button', { name: /Solicitação de eventos/ }).click();
  await page.getByRole('button', { name: /^Eventos/ }).click();
  await page.getByLabel('Solicitante *', { exact: true }).fill('Carlos Teste');
  await page.getByLabel('E-mail *', { exact: true }).fill('carlos.teste@exemplo.com');
  await page.getByLabel('Contato para tratativas *', { exact: true }).fill('11987654321');
  await page.getByLabel('Região *', { exact: true }).click();
  await page.getByRole('option', { name: 'São Paulo' }).click();
  await page.getByLabel('Nome da instituição/empresa solicitante *').fill('Prefeitura Teste');
  await page.getByLabel('Dia do evento *').fill(isoPlusDays(20));
  await page.getByLabel('Horário do evento *').fill('14h às 18h');
  await page.getByLabel('Local do evento *').fill('Ginásio Municipal');
  await page.getByLabel('Público esperado *').fill('500 pessoas');
  await page.getByLabel('Finalidade do evento *').fill('Divulgação da marca');
  await page.getByLabel(/Como seria a participação da Junco/).fill('Stand com degustação');
  await page.locator('input[type=file]').first().setInputFiles({ name: 'kit.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(page.getByText('kit.png')).toBeVisible();

  // Sem Cidade o envio fica bloqueado
  const revisar = page.getByRole('button', { name: 'Revisar e enviar' });
  await expect(revisar).toBeDisabled();

  await page.getByLabel('Cidade *', { exact: true }).fill('Goiânia - GO');
  await expect(revisar).toBeEnabled();
  await revisar.click();

  const review = page.getByTestId('review');
  await expect(review.getByRole('heading', { name: 'Confira suas respostas' })).toBeVisible();
  await expect(review).toContainText('Cidade');
  await expect(review).toContainText('Goiânia - GO');
  await review.getByRole('button', { name: 'Confirmar e enviar' }).click();
  await expect(page.getByText('Solicitação enviada!')).toBeVisible();

  expect(erros).toEqual([]);
});

test('painel: "Em análise" tira o selo Atrasado e Aprovar continua disponível', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('dialog', d => { erros.push('modal nativo: ' + d.message()); d.dismiss(); });

  // Evento pendente criado há 4 dias, já com Cidade (fakes do Firestore).
  await page.addInitScript((seed) => {
    if (localStorage.getItem('__fake_fs__')) return;
    localStorage.setItem('__fake_fs__', JSON.stringify(seed));
  }, {
    'products/p1': { name: 'Bala de Coco - 400g', order: 1, active: true },
    'requests/evt-teste-1': {
      uid: 'u-rca', requestType: 'evento', tradeCode: CODE,
      rcaName: 'Carlos Teste', rcaEmail: 'carlos.teste@exemplo.com', rcaPhone: '11987654321',
      partnerCode: 'Prefeitura Teste', region: 'São Paulo', city: '', eventCity: 'Goiânia - GO',
      dateOfAction: isoPlusDays(20), days: 1, totalValue: 0, status: 'pending', createdAt: ANTIGA,
      eventTime: '14h às 18h', eventLocation: 'Ginásio Municipal', eventPurpose: 'Divulgação da marca',
      institutionName: 'Prefeitura Teste', eventCategory: 'esportivo', expectedAudience: '500 pessoas',
      juncoParticipation: 'Stand com degustação', mediaKitUrl: 'https://res.cloudinary.com/teste/image/upload/arquivo-de-teste.png',
    },
  });
  await setupMocks(page);
  await page.goto('./');
  await loginAdmin(page);
  await goAdmin(page);
  await page.getByRole('tab', { name: /Solicitações/ }).click();

  const linha = page.getByRole('row', { name: new RegExp(CODE) });
  await expect(linha).toContainText('Atrasado');
  await expect(linha).toContainText('Aguardando aprovação');

  await linha.getByRole('button', { name: 'Em análise', exact: true }).click();
  await expect(page.getByText('Solicitação em análise')).toBeVisible();
  // A fila abre em "Pendentes": a solicitação sai dela. Confere na aba "Em análise".
  await expect(linha).toHaveCount(0);
  await page.getByRole('group', { name: 'Filtrar por situação' }).getByRole('button', { name: /Em análise/ }).click();
  await expect(linha).toContainText('Em análise');
  await expect(linha).not.toContainText('Atrasado');
  await expect(linha.getByRole('button', { name: 'Em análise', exact: true })).toHaveCount(0);

  // Ainda dá para decidir: aprovar continua disponível
  await expect(linha.getByRole('button', { name: 'Aprovar', exact: true })).toBeVisible();
  await expect(linha.getByRole('button', { name: 'Recusar', exact: true })).toBeVisible();

  expect(erros).toEqual([]);
});
