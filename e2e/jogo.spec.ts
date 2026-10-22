/** Testes de interface (spec §26.3). Rodar após `npm run build`. */
import { expect, test } from '@playwright/test';

test('campanha inicia em jan/2022, decide, avança, salva e sobrevive a recarregar', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a governar' }).click();
  await expect(page.locator('.dateline')).toContainText('1º de janeiro de 2022');

  // Decisão de evento com resposta visível
  const decisao = page.locator('.decision').first();
  await expect(decisao).toBeVisible();
  await decisao.getByRole('button', { name: 'Escolher' }).first().click();
  await expect(page.locator('.toast').first()).toContainText('Decidiu');

  // Lançar política com validação
  await page.getByRole('link', { name: 'Governo e agenda' }).click();
  const card = page.locator('.card', { hasText: 'Mutirão nacional de cirurgias' });
  await card.getByRole('button', { name: /Lançar/ }).click();
  await expect(page.locator('.toast', { hasText: 'Lançou' })).toBeVisible();

  // Avançar o mês (com confirmação se houver decisões pendentes)
  await page.getByRole('button', { name: /Encerrar janeiro/ }).click();
  const confirmar = page.getByRole('button', { name: 'Confirmar e encerrar' });
  if (await confirmar.isVisible()) await confirmar.click();
  await expect(page.getByRole('dialog', { name: 'Relatório do mês' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Balanço de janeiro de 2022');
  await page.getByRole('button', { name: /Seguir para fevereiro/ }).click();
  await expect(page.locator('.dateline')).toContainText('fevereiro de 2022');

  // Explicação causal abre a partir de um indicador
  await page.getByRole('link', { name: 'Primeira página' }).click();
  await page.getByRole('button', { name: /Por que mudou: IPCA em 12 meses/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Inflação corrente', { timeout: 5000 }).catch(async () => expect(page.getByRole('dialog')).toContainText('O governo controlava'));
  await page.getByRole('button', { name: 'Fechar' }).click();

  // Sem rolagem horizontal da página
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `test-results/capa-${info.project.name}.png`, fullPage: false });

  // Persistência: recarregar abre a mesma campanha em fevereiro
  await page.reload();
  await expect(page.locator('.dateline')).toContainText('fevereiro de 2022');

  // Salvamentos listados; exclusão exige confirmação
  await page.getByRole('link', { name: 'Salvamentos' }).click();
  await expect(page.locator('table').first()).toContainText('Salvamento automático');
  await page.getByRole('button', { name: 'Excluir' }).first().click();
  await expect(page.getByRole('button', { name: 'Excluir de vez' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  for (const sec of ['Economia e orçamento', 'Congresso', 'Instituições', 'Estados', 'Opinião e eleições', 'Arquivo', 'Dados e fontes']) {
    await page.getByRole('link', { name: sec }).click();
    await expect(page.locator('main h2').first()).toBeVisible();
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ov, `rolagem horizontal em ${sec}`).toBeLessThanOrEqual(1);
  }
  await page.getByRole('link', { name: 'Economia e orçamento' }).click();
  await page.screenshot({ path: `test-results/economia-${info.project.name}.png`, fullPage: false });
});

test('o jogo abre offline depois de carregado (sem rede, salvamento local)', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a governar' }).click();
  await expect(page.locator('.dateline')).toContainText('janeiro de 2022');
  await context.setOffline(true);
  await page.getByRole('button', { name: /Encerrar janeiro/ }).click();
  const confirmar = page.getByRole('button', { name: 'Confirmar e encerrar' });
  if (await confirmar.isVisible()) await confirmar.click();
  await expect(page.getByRole('dialog', { name: 'Relatório do mês' })).toBeVisible();
  await context.setOffline(false);
});
