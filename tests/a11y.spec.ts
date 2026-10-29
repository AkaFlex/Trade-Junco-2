import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupMocks, loginAdmin, goAdmin, fillTasting, isoPlusDays } from './helpers';

// Auditoria axe-core (WCAG 2.1 A/AA) das telas principais, em desktop e mobile 375 px.
// Falha só com violações "serious"/"critical"; as demais são impressas para registro.
const audit = async (page: Page, nome: string) => {
  await page.waitForTimeout(600); // deixa terminar as animações de entrada (contraste é medido com opacidade)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  r.violations.forEach(v => console.log(`[axe] ${nome}: ${v.impact} ${v.id} (${v.nodes.length}) ${v.help}`));
  const graves = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(graves.map(v => `${v.id} x${v.nodes.length}`), nome).toEqual([]);
};

for (const [rotulo, size] of [['desktop', { width: 1280, height: 800 }], ['mobile375', { width: 375, height: 812 }]] as const) {
  test(`axe: telas e modais (${rotulo})`, async ({ page }) => {
    await page.setViewportSize(size);
    await setupMocks(page);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: /Bem-vindo/ })).toBeVisible();
    await audit(page, `${rotulo} home`);

    await fillTasting(page);
    await expect(page.getByTestId('review')).toBeVisible();
    await audit(page, `${rotulo} confira suas respostas`);
    await page.getByRole('button', { name: 'Confirmar e enviar' }).click();
    await expect(page.getByText('Ação solicitada!')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar ao início' }).click();

    await loginAdmin(page);
    await goAdmin(page);
    await audit(page, `${rotulo} painel visão geral`);
    await page.getByRole('tab', { name: /Solicitações/ }).click();
    await expect(page.getByRole('button', { name: 'Aprovar' }).first()).toBeVisible();
    await audit(page, `${rotulo} solicitações (badges)`);

    // ConfirmModal: aprova, depois abre o de pagamento não existe ainda; usa "Reabrir"/"Exportar" não disponíveis.
    // O modal de confirmação mais simples de abrir é "Exportar CSV".
    await page.getByRole('button', { name: /Exportar CSV/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, `${rotulo} ConfirmModal`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('tab', { name: /Financeiro/ }).click();
    await audit(page, `${rotulo} financeiro`);
  });
}

test('mobile 375: sem rolagem horizontal na home', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setupMocks(page);
  await page.goto('./');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(1);
  void isoPlusDays;
});
