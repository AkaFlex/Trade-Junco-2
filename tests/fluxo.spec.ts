import { test, expect } from '@playwright/test';
import { setupMocks, loginAdmin, goAdmin, fillTasting, PNG_1PX } from './helpers';

// Fluxo completo: RCA cria → "Confira suas respostas" → gestor aprova → degustadora lança Sell-Out
// → RCA envia reembolso → gestor marca como pago. Tudo contra Firebase/Cloudinary simulados.
test('criar → aprovar → Sell-Out → reembolso → pagar', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('dialog', d => { erros.push('modal nativo: ' + d.message()); d.dismiss(); }); // alert/confirm nativo nunca pode abrir
  await setupMocks(page);
  await page.goto('./');

  // 1. RCA cria a degustação e passa pela revisão
  await fillTasting(page);
  const review = page.getByTestId('review');
  await expect(review.getByRole('heading', { name: 'Confira suas respostas' })).toBeVisible();
  await expect(review).toContainText('Maria Teste');
  await expect(review).toContainText('123456');
  await review.getByRole('button', { name: 'Alterar respostas' }).click();
  await expect(page.getByLabel('Nome completo *')).toHaveValue('Maria Teste'); // dados mantidos
  await page.getByRole('button', { name: 'Revisar e finalizar' }).click();
  await page.getByRole('button', { name: 'Confirmar e enviar' }).click();
  await expect(page.getByText('Ação solicitada!')).toBeVisible();
  const code = (await page.locator('.select-all').innerText()).trim();
  expect(code).toMatch(/^TJ-[A-Z0-9]{10}$/);
  await expect(page.getByTestId('qr-sellout')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();

  // 2. Gestor aprova (pelo atalho de teclado A, para exercitar a fila)
  await loginAdmin(page);
  await goAdmin(page);
  await page.getByRole('tab', { name: /Solicitações/ }).click();
  await expect(page.getByTestId('atalhos')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(code) })).toBeVisible();
  await page.keyboard.press('a');
  await expect(page.getByText('Degustação aprovada!')).toBeVisible();
  await page.getByRole('button', { name: /Em execução/ }).click();
  await expect(page.getByRole('row', { name: new RegExp(code) })).toContainText('Em execução');

  // 3. Degustadora lança o Sell-Out pelo link
  await page.goto(`./#/sellout?code=${code}`);
  await page.getByRole('button', { name: /Preencher/ }).click();
  await page.getByLabel('Nome da loja *').fill('Supermercado Teste');
  await page.getByLabel('Nome do vendedor *').fill('João Teste');
  await page.getByRole('button', { name: 'Aumentar Bala de Coco - 400g' }).click();
  await page.getByRole('button', { name: 'Salvar relatório 1' }).click();
  await expect(page.getByText('Processo finalizado')).toBeVisible();

  // 4. RCA envia o reembolso (uploads simulados)
  await page.goto('./#/reimbursement');
  await page.getByLabel('Código da ação').fill(code);
  await page.getByRole('button', { name: /Buscar/ }).click();
  await page.getByRole('button', { name: /Solicitar reembolso/ }).click();
  const png = { name: 'foto.png', mimeType: 'image/png', buffer: PNG_1PX };
  await page.locator('input[type=file]').nth(0).setInputFiles(png);
  await expect(page.getByText('1 arquivo(s) enviado(s)!').first()).toBeVisible();
  await page.locator('input[type=file]').nth(1).setInputFiles({ ...png, name: 'nota.png' });
  await page.getByLabel('Chave PIX').fill('maria@exemplo.com');
  await page.getByLabel('Nome do titular').fill('Maria Teste');
  await page.getByLabel('CPF do titular').fill('12345678909');
  await page.getByRole('button', { name: 'Finalizar e pedir pagamento' }).click();
  await expect(page.getByText('Solicitação finalizada!')).toBeVisible();

  // 5. Gestor paga (modal de confirmação personalizado)
  await page.goto('./#/admin');
  await page.getByRole('tab', { name: /Financeiro/ }).click();
  await expect(page.getByText(code)).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como pago' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar pagamento?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Marcar como pago' }).click();
  await expect(page.getByText('Pagamento registrado!')).toBeVisible();
  await page.getByRole('button', { name: /Pagos \/ concluídos/ }).click();
  await expect(page.getByText(code)).toBeVisible();

  expect(erros).toEqual([]);
});
