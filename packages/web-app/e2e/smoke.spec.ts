import { expect, test } from '@playwright/test';

test('the application shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toHaveText('Дерево Менторів УСС');
});
