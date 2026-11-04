import { expect, test } from '@playwright/test';
import { loadDemoMembers } from './demoMembers';

test.describe('graph, search and card', () => {
  test('1. search → select → tree is highlighted and the card is correct', async ({
    page,
    request,
  }) => {
    const { memberInTree, founder } = await loadDemoMembers(request);
    await page.goto('/');
    await expect(page).toHaveURL(/\/uk\/$/);

    await page.getByRole('combobox').fill(memberInTree.fullName ?? '');
    await page.getByRole('option').first().click();

    const graph = page.getByTestId('graph-view');
    await expect(graph).toHaveAttribute('data-selected-tree-id', memberInTree.treeId ?? '');
    await expect(graph).toHaveAttribute('data-selected-member-id', memberInTree.memberId);
    await expect(page).toHaveURL(
      new RegExp(`/uk/tree/${memberInTree.treeId}\\?member=${memberInTree.memberId}`),
    );

    const card = page.getByTestId('person-card');
    await expect(card.getByRole('heading')).toHaveText(memberInTree.fullName ?? '');
    await expect(card).toContainText(`Засновник дерева: ${founder.fullName}`);
    await expect(card).toContainText('Ментор:');
    await expect(card).toContainText(`Усього нащадків: ${memberInTree.descendantCount}`);

    await page.keyboard.press('Escape');
    await expect(graph).toHaveAttribute('data-selected-tree-id', '');
    await expect(card).toHaveCount(0);
  });

  test('2. a member without a tree gets the "not in a tree yet" card with the form link', async ({
    page,
    request,
  }) => {
    const { memberWithoutTree, document } = await loadDemoMembers(request);
    await page.goto('/uk/');
    await page.getByRole('combobox').fill(memberWithoutTree.fullName ?? '');
    await expect(page.getByRole('option').first()).toContainText('Ще не в дереві');
    await page.getByRole('option').first().click();

    const card = page.getByTestId('person-card');
    await expect(card).toContainText('Ще не в дереві');
    await expect(card.getByRole('link', { name: 'Заповнити форму' })).toHaveAttribute(
      'href',
      document.settings.formUrl ?? '',
    );
  });

  test('3. nothing found shows the message and the form button', async ({ page }) => {
    await page.goto('/uk/');
    await page.getByRole('combobox').fill('Ящдфйцукен');
    await expect(page.getByRole('status')).toContainText('Нікого не знайдено');
    await expect(page.getByRole('link', { name: 'Заповнити форму' }).first()).toBeVisible();
  });

  test('keyboard: "/" focuses search, arrows and Enter choose', async ({ page, request }) => {
    const { memberInTree } = await loadDemoMembers(request);
    await page.goto('/uk/');
    await expect(page.getByRole('combobox')).toBeVisible();
    await page.keyboard.press('/');
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.keyboard.type((memberInTree.fullName ?? '').split(' ')[0] ?? '');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('person-card')).toBeVisible();
  });

  test('direct links open the tree; unknown ids show a notice; language and back button work', async ({
    page,
    request,
  }) => {
    const { memberInTree, founder } = await loadDemoMembers(request);
    await page.goto(`/en/tree/${founder.memberId}`);
    await expect(page.getByTestId('graph-view')).toHaveAttribute(
      'data-selected-tree-id',
      founder.memberId,
    );
    await expect(page.getByTestId('person-card')).toContainText('Tree founder');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/uk/tree/does-not-exist');
    await expect(page.getByText('Дерево не знайдено')).toBeVisible();
    await expect(page.getByTestId('graph-view')).toHaveAttribute('data-selected-tree-id', '');

    await page.goto('/uk/');
    await page.getByRole('combobox').fill(memberInTree.fullName ?? '');
    await page.getByRole('option').first().click();
    await page.goBack();
    await expect(page.getByTestId('graph-view')).toHaveAttribute('data-selected-tree-id', '');
  });

  test('shows the load error with a retry button', async ({ page }) => {
    await page.route('**/graph.json', (route) => route.abort());
    await page.goto('/uk/');
    await expect(page.getByText('Не вдалося завантажити дані')).toBeVisible();
    await page.unroute('**/graph.json');
    await page.getByRole('button', { name: 'Спробувати ще' }).click();
    await expect(page.getByTestId('graph-view')).toBeVisible();
  });

  test('the disclaimer and the update date are always visible', async ({ page }) => {
    await page.goto('/uk/');
    await expect(page.getByText('Дані неповні й можуть містити помилки')).toBeVisible();
    await expect(page.getByText(/Дані оновлено \d+ \S+ \d{4}/)).toBeVisible();
  });
});
