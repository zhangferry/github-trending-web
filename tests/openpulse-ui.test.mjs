// Use an existing Playwright installation: OPENPULSE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.OPENPULSE_PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.OPENPULSE_TEST_ORIGIN || 'http://localhost:3000';
const authors = Array.from({ length: 5 }, (_, i) => ({ login: `author${i}`, avatarUrl: `https://github.com/author${i}.png`, contributions: 100 - i }));
const repo = { fullName: 'owner/project', owner: 'owner', description: '真实项目说明 <script>alert(1)</script>', language: 'TypeScript', stars: 12345, forks: 456, growth: 789, forkGrowth: null, contributors: authors, contributorsRanked: true };
const detail = { ...repo, topics: ['tools'], pushedAt: '2026-11-08T00:00:00Z', generatedAt: '2026-11-08T00:00:00Z', sections: [{ heading: 'Features', text: '真实 README 的核心功能原文，不执行 <script>alert(1)</script>。', url: 'https://github.com/owner/project#features' }], resources: [{ title: 'README', description: '来源文档', url: 'https://github.com/owner/project#readme' }], starter: null, latestRelease: null };
async function setup(t, { detailFailure = false, summaryStatus = 'ready' } = {}) {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const requests = []; let failDetail = detailFailure;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()); requests.push(url);
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/openpulse/trending') {
      const lang = url.searchParams.get('language'); const period = url.searchParams.get('since');
      return send({ repositories: lang === 'java' ? [] : [{ ...repo, growth: period === 'weekly' ? 1000 : 789 }], window: period, source: 'live', generatedAt: '2026-11-08T00:00:00Z', pulse: { newStars: period === 'weekly' ? 1000 : 789, newForks: null } });
    }
    if (url.pathname === '/api/openpulse/contributors') return send({ 'owner/project': { contributors: authors, ranked: true } });
    if (url.pathname === '/api/openpulse/repository') { if (failDetail) return send({ error: 'GitHub 暂时不可用' }, 503); return send({ ...detail, aiAvailable: true, readmeAvailable: true }); }
    if (url.pathname === '/api/openpulse/summary') return send(summaryStatus === 'ready' ? { status: 'ready', items: [{ field: 'purpose', text: '根据文档总结项目用途。<script>alert(1)</script>', source: { title: 'Features', url: 'https://github.com/owner/project#features' } }] } : { status: summaryStatus });
    return send({});
  });
  // External image/font loading is irrelevant to interaction tests.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://github.com/**/*.png*', route => route.abort());
  await page.goto(origin, { waitUntil: 'domcontentloaded' }); await page.locator('.row').waitFor();
  return { page, errors, requests, repairDetail: () => { failDetail = false; } };
}

test('anonymous browsing, five authors, detail navigation, safe excerpts and back without account controls', async t => {
  const { page, errors, requests } = await setup(t);
  assert.equal(await page.locator('.authors .author-stack a').count(), 5);
  assert.equal(await page.locator('.row .repo-title .owner').getAttribute('href'), 'https://github.com/owner');
  assert.equal(await page.locator('#loginButton, .star-action, .follow-button').count(), 0);
  await page.locator('.row-link').click({ position: { x: 8, y: 8 } });
  await page.locator('.detail-hero h1').waitFor();
  assert.equal(await page.locator('.person').count(), 5);
  assert.equal(await page.locator('.primary-link').filter({ hasText: '访问原仓库' }).getAttribute('href'), 'https://github.com/owner/project');
  assert((await page.locator('.reading').innerText()).includes('<script>alert(1)</script>'));
  assert.equal(await page.locator('.reading script').count(), 0);
  assert.equal(await page.locator('#loginButton, .star-action, .follow-button').count(), 0);
  assert(requests.every(url => !/^\/api\/(session|auth|star|follow|status)/.test(url.pathname)));
  await page.locator('.breadcrumb [data-back]').click(); await page.locator('.row').waitFor();
  await page.getByRole('button', { name: '本周', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#starsLabel').textContent.startsWith('本周'));
  assert.equal(await page.locator('.count small').first().innerText(), '+1K');
  await page.selectOption('#languageSelect', 'java');
  await page.locator('.state').filter({ hasText: '暂无该语言' }).waitFor();
  assert.deepEqual(errors, []);
});

test('mobile keeps both count columns, author links, details and original repository without overflow', async t => {
  const { page, errors } = await setup(t);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator('.row .count').count(), 2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.repo-title b').click(); await page.locator('.detail-hero h1').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('.person').count(), 5); assert.deepEqual(errors, []);
});

test('detail request failure exposes original repository and can be retried', async t => {
  const { page, repairDetail, errors } = await setup(t, { detailFailure: true });
  await page.locator('.repo-title b').click(); await page.locator('[data-retry="detail"]').waitFor();
  assert.equal(await page.locator('#detailView .primary-link').getAttribute('href'), 'https://github.com/owner/project');
  repairDetail(); await page.locator('[data-retry="detail"]').click(); await page.locator('.detail-hero h1').waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.detail-hero h1').waitFor(); assert.deepEqual(errors, []);
});

test('a pending weekly response cannot overwrite daily after browser Back', async t => {
  const { page } = await setup(t);
  let release;
  await page.route('**/api/openpulse/trending?**', async route => {
    if (new URL(route.request().url()).searchParams.get('since') !== 'weekly') return route.fallback();
    await new Promise(resolve => { release = resolve; });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ repositories: [{ ...repo, growth: 99999 }], source: 'live', generatedAt: '2026-11-08T00:00:00Z', window: 'weekly', pulse: { newStars: 99999, newForks: null } }) });
  });
  await page.getByRole('button', { name: '本周', exact: true }).click();
  await page.waitForTimeout(100); await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.locator('.row').waitFor(); release(); await page.waitForTimeout(150);
  assert.equal(await page.locator('#starsLabel').innerText(), '今日榜单新增 Star');
  assert.equal(await page.locator('.count small').first().innerText(), '+789');
});

test('AI summary preserves source links and escapes generated text', async t => {
  const { page, errors } = await setup(t);
  await page.locator('.repo-title b').click();
  await page.getByRole('button', { name: '生成解读' }).click();
  await page.locator('.ai-point').waitFor();
  assert.equal(await page.locator('.ai-point a').getAttribute('href'), 'https://github.com/owner/project#features');
  assert.equal(await page.locator('.ai-point script').count(), 0);
  assert.equal(await page.locator('#readmeExtracts').evaluate(el => el.open), false);
  assert.deepEqual(errors, []);
});

test('README remains visible when AI generation is unavailable', async t => {
  const { page } = await setup(t, { summaryStatus: 'unavailable' });
  await page.locator('.repo-title b').click();
  await page.getByRole('button', { name: '生成解读' }).click();
  await page.locator('#aiStatus').filter({ hasText: 'AI 解读暂不可用' }).waitFor();
  assert.equal(await page.locator('#readmeExtracts').evaluate(el => el.open), true);
});
