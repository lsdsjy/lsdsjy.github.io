const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
});

async function openHome(page) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.classList.contains('swup-enabled'));
  await page.evaluate(() => { window.documentMarker = 'original'; });
}

test('switches pages without reloading, updates head, preserves shell', async ({ page }) => {
  const errors = [];
  const commentRequests = [];
  page.on('request', request => {
    if (request.url().includes('cusdis.com')) commentRequests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await openHome(page);
  await page.evaluate(() => { document.querySelector('#header').dataset.persistent = 'yes'; });
  await page.locator('a.article-title[href="/ref-element-vue/"]').click();
  await expect(page).toHaveURL(/\/ref-element-vue\/$/);
  await expect(page.locator('h1.article-title')).toHaveText('Ref Element of Component in Vue.js');
  await expect(page).toHaveTitle(/Ref Element of Component/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://lsdsjy.github.io/ref-element-vue/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://lsdsjy.github.io/ref-element-vue/index.html');
  await page.locator('a[href="/double-underscore-esmodule/"]').first().click();
  await expect(page.locator('h1.article-title')).toHaveText('为什么我们需要 __esModule');
  await expect(page.locator('#cusdis_thread, .comments')).toHaveCount(0);
  expect(commentRequests).toEqual([]);
  expect(await page.evaluate(() => window.documentMarker)).toBe('original');
  await expect(page.locator('#header')).toHaveAttribute('data-persistent', 'yes');
  expect(errors).toEqual([]);
});

test('prefetches hovered links and consumes the cached HTML', async ({ page }) => {
  await openHome(page);
  let requests = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/blogging-platforms/') requests++;
  });
  const link = page.locator('a.article-title[href="/blogging-platforms/"]');
  const fetched = page.waitForResponse(response => new URL(response.url()).pathname === '/blogging-platforms/');
  await link.hover();
  await fetched;
  await link.click();
  await expect(page.locator('h1.article-title')).toHaveText('博客系统十年变迁');
  expect(requests).toBe(1);
});

test('restores scroll on back and forward, including excerpt anchors', async ({ page }) => {
  await openHome(page);
  const link = page.locator('.article-more-link a[href="/task-management/#more"]');
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.addEventListener('click', () => { window.lastClickScroll = scrollY; }, { capture: true, once: true });
  });
  await link.click();
  await expect(page).toHaveURL(/\/task-management\/#more$/);
  await expect.poll(() => page.locator('#more').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(5);
  const homeScroll = await page.evaluate(() => window.lastClickScroll);
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(homeScroll, -1);
  await page.goForward();
  await expect(page).toHaveURL(/\/task-management\/#more$/);
  await expect(page.locator('h1.article-title')).toHaveText('个人任务管理工作流探索');
  expect(await page.evaluate(() => window.documentMarker)).toBe('original');
});

test('initializes images once when revisiting, and handles archive navigation', async ({ page }) => {
  await openHome(page);
  await page.locator('a.article-title[href="/task-management/"]').click();
  await expect(page.locator('#main .article-entry img').first()).toBeVisible();
  const captions = await page.locator('#main .caption').count();
  const wrappers = await page.locator('#main a.article-image').count();
  expect(wrappers).toBeGreaterThan(0);
  await page.locator('#main-nav a[href="/archives"]').click();
  await expect(page).toHaveTitle(/归档/);
  await expect(page.locator('#main-nav a[href="/archives"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://lsdsjy.github.io/archives/');
  await expect(page.locator('#cusdis_thread')).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('h1.article-title')).toHaveText('个人任务管理工作流探索');
  await expect(page.locator('#main a.article-image')).toHaveCount(wrappers);
  await expect(page.locator('#main .caption')).toHaveCount(captions);
});

test('falls back to document navigation when fetching fails', async ({ page }) => {
  await openHome(page);
  await page.route('**/node/', route => {
    if (route.request().isNavigationRequest()) return route.continue();
    return route.fulfill({ status: 503, body: 'Unavailable' });
  });
  const reloaded = page.waitForEvent('framenavigated', frame => frame === page.mainFrame() && frame.url().endsWith('/node/'));
  await page.locator('a.article-title[href="/node/"]').click();
  // A History API URL update is also a frame event; wait for the new document.
  await reloaded;
  await page.waitForFunction(() => !window.documentMarker);
  await expect(page).toHaveURL(/\/node\/$/);
  expect(await page.evaluate(() => window.documentMarker)).toBeUndefined();
  await expect(page.locator('.article-title').first()).toHaveText('写在人生的一个小小节点');
});

test('direct URLs retain complete content without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/ref-element-vue/');
  await expect(page.locator('.article-title').first()).toHaveText('Ref Element of Component in Vue.js');
  await expect(page.locator('figure.highlight').first()).toBeVisible();
  await page.locator('#main-nav a[href="/archives"]').click();
  await expect(page).toHaveTitle(/归档/);
  await context.close();
});

test('same-page anchors work and admin links use normal navigation', async ({ page }) => {
  await openHome(page);
  await page.locator('a.article-title[href="/ref-element-vue/"]').click();
  await expect(page.locator('h1.article-title')).toHaveText('Ref Element of Component in Vue.js');
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '#The-Solution';
    link.textContent = 'Jump to solution';
    document.querySelector('#main').prepend(link);
  });
  await page.getByRole('link', { name: 'Jump to solution' }).click();
  await expect(page).toHaveURL(/#The-Solution$/);
  await expect.poll(() => page.locator('#The-Solution').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(5);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/admin/';
    link.textContent = 'Preview admin link';
    document.body.prepend(link);
  });
  const documentRequest = page.waitForRequest(request => request.isNavigationRequest() && request.url().endsWith('/admin/'));
  await page.getByRole('link', { name: 'Preview admin link' }).click();
  await documentRequest;
});

test('history scroll restoration also works with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.evaluate(() => scrollTo(0, 1200));
  await page.locator('a.article-title[href="/blogging-platforms/"]').focus();
  const position = await page.evaluate(() => scrollY);
  await page.keyboard.press('Enter');
  await expect(page.locator('h1.article-title')).toHaveText('博客系统十年变迁');
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(position, -1);
});
