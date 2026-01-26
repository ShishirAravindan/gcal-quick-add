const { test, expect } = require('@playwright/test');

test.describe('Quick Add E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Vite dev server usually runs on 5173
    await page.goto('http://localhost:5173/gcal-quick-add/');
  });

  test('should display the main UI correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Quick Add');
    await expect(page.locator('#eventInput')).toBeVisible();
    await expect(page.locator('#mainActionButton')).toBeVisible();
  });

  test('should switch serving patterns and update UI theme', async ({ page }) => {
    const browserDock = page.locator('.dock-item[data-pattern="BROWSER"]');
    await browserDock.click();
    
    // Check if the glow color changed (via CSS variable check)
    const glowColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--pattern-glow').trim()
    );
    expect(glowColor).toBe('#d33682'); // --color-browser (Solarized Magenta)
  });

  test('should handle the 3D flip for API key configuration', async ({ page }) => {
    const cloudDock = page.locator('.dock-item[data-pattern="CLOUD"]');
    await cloudDock.click();
    
    // If key not present, button should say "Setup Required"
    const btn = page.locator('#mainActionButton');
    if (await btn.textContent() === 'Setup Required') {
        await btn.click();
        await expect(page.locator('#actionFlipCard')).toHaveClass(/flipped/);
        await expect(page.locator('#apiKeyInput')).toBeVisible();
    }
  });

  test('should type an example into the magic box', async ({ page }) => {
    const chip = page.locator('.chip').first();
    const exampleText = await chip.getAttribute('data-example');
    await chip.click();
    
    // Wait for typing animation (rough check)
    await page.waitForTimeout(1000);
    const inputValue = await page.locator('#eventInput').inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
  });
});