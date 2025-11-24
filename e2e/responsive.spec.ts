import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('Mobile viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check if toolbar is visible/accessible
    const toolbar = page.locator('.toolbar-container'); // Need to ensure class exists
    await expect(toolbar).toBeVisible();

    // Check if header adapts
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check canvas full screen
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('Tablet viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Check elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('Desktop viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Check elements
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
