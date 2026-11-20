const { test, expect } = require('@playwright/test');

test.describe('Quick Add E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Vite dev server usually runs on 5173
    await page.goto('http://localhost:5173/gcal-quick-add/');
  });

  test('should display the main UI correctly', async ({ page }) => {
    const logo = page.getByRole('heading', { name: 'Quick Add', level: 1 }).locator('img');
    await expect.poll(() => logo.evaluate(image => image.naturalWidth)).toBe(192);
    await expect(logo).toHaveCSS('width', '80px');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/favicon\.png$/);
    await expect(page.locator('#eventInput')).toBeVisible();
    await expect(page.locator('#mainActionButton')).toBeVisible();
    const labelFont = await page.locator('label[for="eventInput"]').evaluate(element => getComputedStyle(element).fontFamily);
    await expect(page.locator('#eventInput')).toHaveCSS('font-family', labelFont);
    await expect(page.locator('#mainActionButton')).toHaveCSS('font-family', labelFont);
  });

  test('keeps cloud, browser, and local providers in model settings', async ({ page }) => {
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    await settings.click();
    await expect(page.getByRole('radio')).toHaveCount(5);
    await expect(page.getByRole('radio', { name: 'Google AI Studio' })).toBeChecked();
    await page.getByText('OpenRouter', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'OpenRouter' })).toBeChecked();
    await expect(page.locator('#currentModelIcon')).toHaveAttribute('href', '#icon-openrouter');
    await expect(page.getByLabel('OpenRouter API key')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toBeFocused();
    await settings.click();
    await expect(page.locator('#currentModelLabel')).toBeVisible();
    await expect(page.locator('#currentModelLabel')).toHaveText('OpenRouter (Auto)');
  });

  test('preserves multiline input through model setup', async ({ page }) => {
    const input = page.getByLabel('Describe an event');
    await expect(input).toBeFocused();
    await input.fill('Dinner tonight at 8pm');
    await input.press('End');
    await input.press('Shift+Enter');
    await input.pressSequentially('At Beco');
    await input.press('Enter');
    await expect(page.getByLabel('Google AI Studio API key')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(input).toHaveValue('Dinner tonight at 8pm\nAt Beco');
  });

  test('discovers Gemini models and preserves an explicit choice until it disappears', async ({ page }) => {
    const model = (id, displayName, method = 'generateContent') => ({
      name: 'models/' + id,
      displayName,
      supportedGenerationMethods: [method],
    });
    let hydrogenAvailable = true;
    await page.route(url => url.origin === 'https://generativelanguage.googleapis.com' && url.pathname === '/v1beta/models', async route => {
      expect(route.request().headers()['x-goog-api-key']).toBe('test-ai-studio-key');
      const nextPage = new URL(route.request().url()).searchParams.get('pageToken') === 'page-two';
      const json = nextPage ? { models: [model('gemini-4-carbon', 'Gemini 4 Carbon')] } : {
        models: [
          ...(hydrogenAvailable ? [model('gemini-4-hydrogen', 'Gemini 4 Hydrogen')] : []),
          model('gemini-4-image', 'Image model'),
          model('gemini-embedding', 'Embedding model', 'embedContent'),
        ],
        nextPageToken: 'page-two',
      };
      await route.fulfill({ json, headers: { 'access-control-allow-origin': '*' } });
    });

    await page.getByRole('button', { name: 'Set up model' }).click();
    await page.getByLabel('Google AI Studio API key').fill('test-ai-studio-key');
    await page.getByRole('button', { name: 'Save key' }).click();
    const picker = page.getByRole('list', { name: 'Available Gemini models' });
    const summary = page.locator('#googleModelSummary');
    await expect(picker.getByRole('button')).toHaveCount(2);
    await expect(summary).toHaveText('Choose a model');
    await picker.getByRole('button', { name: /Gemini 4 Hydrogen/ }).click();
    await expect(page.getByRole('button', { name: 'Open in Calendar' })).toBeEnabled();

    await page.reload();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(summary).toHaveText('Gemini 4 Hydrogen');
    await expect(picker).toBeHidden();
    await summary.press('Enter');
    await expect(picker.getByRole('button', { name: /Gemini 4 Hydrogen/ })).toHaveAttribute('aria-pressed', 'true');
    hydrogenAvailable = false;
    await page.getByRole('button', { name: 'Refresh Gemini models' }).click();
    await expect(page.getByText('Your saved model is unavailable. Choose another model.')).toBeVisible();
    await expect(summary).toHaveText('Choose a model');
    await picker.getByRole('button', { name: /Gemini 4 Carbon/ }).click();
    await expect(page.getByRole('button', { name: 'Open in Calendar' })).toBeEnabled();

    await page.route('https://generativelanguage.googleapis.com/v1beta/models/gemini-4-carbon:generateContent', async route => {
      expect(route.request().postDataJSON().generationConfig.responseMimeType).toBe('application/json');
      const event = { text: 'Dinner', dates: '20261120T200000/20261120T210000', location: 'Beco', recur: 'FREQ=WEEKLY' };
      await route.fulfill({
        json: { candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(event) }] } }] },
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    await page.route('https://calendar.google.com/**', route => route.fulfill({ body: 'Google Calendar editor' }));
    const input = page.getByLabel('Describe an event');
    await input.fill('Dinner tonight at 8pm');
    await input.press('Enter');
    await expect(page.locator('body')).toHaveText('Google Calendar editor');
    const calendarUrl = new URL(page.url());
    expect(calendarUrl.origin + calendarUrl.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(calendarUrl.searchParams.get('text')).toBe('Dinner');
    expect(calendarUrl.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY');
    expect(calendarUrl.searchParams.get('location')).toBe('Beco');
  });
});

test.describe('Phone composer', () => {
  test.use({ viewport: { width: 390, height: 668 }, isMobile: true, hasTouch: true, userAgent: 'iPhone' });

  test('keeps pasted text on a parse error and opens Calendar from a phone', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gcal_api_key', 'test-ai-studio-key');
      localStorage.setItem('gcal_google_model_id', 'gemini-4-hydrogen');
    });
    const modelName = 'Gemini 4 Hydrogen with an intentionally long display name';
    await page.route(url => url.pathname === '/v1beta/models', route => route.fulfill({
      json: { models: [{ name: 'models/gemini-4-hydrogen', displayName: modelName, supportedGenerationMethods: ['generateContent'] }] },
      headers: { 'access-control-allow-origin': '*' },
    }));
    let dates = 'not a calendar date';
    await page.route('**/models/gemini-4-hydrogen:generateContent', route => route.fulfill({
      json: { candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ text: 'Train', dates }) }] } }] },
      headers: { 'access-control-allow-origin': '*' },
    }));

    await page.goto('/gcal-quick-add/');
    const input = page.getByLabel('Describe an event');
    const calendar = page.getByRole('button', { name: 'Open in Calendar' });
    await expect(calendar).toBeEnabled();
    await expect(input).not.toBeFocused();
    const description = 'Train to Edinburgh\nSaturday, November 21 at 08:30 until 10:15 UTC';
    await input.fill(description);
    await calendar.tap();
    await expect(page.getByRole('alert')).toContainText('invalid date or time');
    await expect(input).toHaveValue(description);

    await expect(calendar).toBeInViewport();
    expect((await calendar.boundingBox()).width).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(calendar).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    const logo = await page.locator('.app-logo img').boundingBox();
    expect(logo.width).toBe(56);
    expect(logo.x + logo.width / 2).toBeCloseTo(160, 0);
    await expect(input).toHaveValue(description);
    await expect(page.locator('.app-header button')).toHaveCount(1);
    await page.getByRole('button', { name: 'Settings', exact: true }).tap();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Google AI Studio' })).toBeChecked();
    await expect(page.getByText(modelName, { exact: true })).toBeVisible();
    expect(await settings.evaluate(dialog => dialog.scrollWidth)).toBeLessThanOrEqual(294);
    await expect(settings.locator('select')).toHaveCount(0);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(24, 32, 27)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');

    await page.getByRole('button', { name: 'Close settings' }).tap();
    dates = '20261121T083000Z/20261121T101500Z';
    await page.route('https://calendar.google.com/**', route => route.fulfill({ body: 'Google Calendar editor' }));
    await calendar.tap();
    await expect(page.locator('body')).toHaveText('Google Calendar editor');
    expect(new URL(page.url()).searchParams.get('dates')).toBe(dates);
  });
});
