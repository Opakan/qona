import { test, expect } from '@playwright/test';

test('landing page loads and shows hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Build automations');
});

test('navigation links are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Product').first()).toBeVisible();
  await expect(page.locator('text=Pricing').first()).toBeVisible();
  await expect(page.locator('text=Try Qona').first()).toBeVisible();
});

test('sign-in link navigates to sign-in page', async ({ page }) => {
  await page.goto('/');
  await page.locator('text=Sign in').first().click();
  await expect(page).toHaveURL(/\/sign-in/);
});

test('sign-in page shows Google auth button', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.locator('text=Continue with Google')).toBeVisible();
});

test('pricing section has three plans', async ({ page }) => {
  await page.goto('/');
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await expect(page.locator('text=Free').first()).toBeVisible();
  await expect(page.locator('text=Starter').first()).toBeVisible();
  await expect(page.locator('text=Pro').first()).toBeVisible();
});

test('features section renders', async ({ page }) => {
  await page.goto('/');
  await page.locator('#product').scrollIntoViewIfNeeded();
  await expect(page.locator('text=Prompt to workflow')).toBeVisible();
});

test('footer has resource links', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('text=Documentation').first()).toBeVisible();
  await expect(page.locator('text=Privacy Policy').first()).toBeVisible();
});

test('unauthenticated users redirected to sign-in for dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('auth callback page shows spinner', async ({ page }) => {
  await page.goto('/auth/callback');
  await expect(page.locator('text=Signing in')).toBeVisible();
});

test('workflows section exists', async ({ page }) => {
  await page.goto('/');
  await page.locator('#workflows').scrollIntoViewIfNeeded();
  await expect(page.locator('text=Popular automations')).toBeVisible();
});

test('CTA section links to sign-in', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: /Try Qona free/i });
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toBeVisible();
});
