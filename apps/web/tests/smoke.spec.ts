import { test, expect } from '@playwright/test';

test('home to results tab shows skeleton cards', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Results' }).click();
  await expect(page.getByText('Destination').first()).toBeVisible();
}); 