import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDataService, parseTrending, parsePublicRepository, forkDelta, readmeSections, validRepository } from '../src/server/openpulse-data.mjs';

const article = period => `<article><a href="/sponsors/wrong">Sponsor</a><h2><a href="/owner/repo.name">Owner / repo</a></h2><p>A &amp; B tool</p><span itemprop="programmingLanguage">TypeScript</span><a href="/owner/repo.name/stargazers"><svg></svg>12,345</a><a href="/owner/repo.name/forks"><svg></svg>456</a><span>1,234 stars ${period}</span>${Array.from({ length: 7 }, (_, i) => `<img src="/avatars/${i}" alt="@person${i}">`).join('')}</article>`;

test('parse Trending retains true repository, totals, up to five authors and all period increments', () => {
  for (const period of ['today', 'this week', 'this month']) {
    const [repo] = parseTrending(article(period));
    assert.equal(repo.fullName, 'owner/repo.name'); assert.equal(repo.stars, 12345); assert.equal(repo.forks, 456);
    assert.equal(repo.growth, 1234); assert.equal(repo.description, 'A & B tool'); assert.equal(repo.contributors.length, 5);
    assert.equal(repo.contributorsRanked, false);
  }
  // Repository dots are literal, not arbitrary regex matches.
  assert.equal(parseTrending(article('today').replaceAll('/repo.name/forks', '/repoXname/forks'))[0].forks, 0);
});

test('Fork changes require a historical baseline for the chosen window', () => {
  const at = 45 * 86400000;
  const history = [{ at: at - 30 * 86400000, forks: 10 }, { at: at - 7 * 86400000, forks: 20 }, { at: at - 86400000, forks: 30 }, { at: at - 300000, forks: 40 }];
  assert.equal(forkDelta(history, { at, forks: 50 }, 'daily'), 20);
  assert.equal(forkDelta(history, { at, forks: 50 }, 'weekly'), 30);
  assert.equal(forkDelta(history, { at, forks: 50 }, 'monthly'), 40);
  assert.equal(forkDelta(history.slice(-1), { at, forks: 50 }, 'daily'), null);
  assert.equal(forkDelta([{ at: at - 86400000, forks: 60 }], { at, forks: 50 }, 'daily'), -10);
});

test('README excerpts strip HTML/code and preserve original section sources', () => {
  const sections = readmeSections('# Demo\nA real description of this package with a sufficiently long introduction to summarize.\n\n## Installation\nInstall the package in an isolated environment and follow the documented setup steps for your operating system.\n```sh\nsecret execute example\n```\n<script>alert("unsafe")</script>', 'https://github.com/owner/repo');
  assert.equal(sections.length, 2); assert.equal(sections[1].heading, 'Installation');
  assert.equal(sections[1].url, 'https://github.com/owner/repo#installation');
  assert(!sections[1].text.includes('<script>')); assert(!sections[1].text.includes('secret execute example'));
});

test('public-page fallback works after anonymous API rate limits and rejects private payloads', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openpulse-page-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const payload = { codeViewLayoutRoute: { repo: { public: true, private: false, ownerLogin: 'owner', defaultBranch: 'main' } }, sidebarAbout: { description: 'Public description', stargazerCount: 50, forksCount: 4, topics: [{ name: 'tools' }], sections: { releases: { releaseCount: 2 } } }, codeViewRepoRoute: { tree: { items: [{ name: 'examples' }] }, overview: { overviewFiles: [{ preferredFileType: 'readme', richText: '<article><h2>Quick start</h2><p>These are genuine instructions from the repository public page and they are long enough to extract for readers.</p></article>' }] } } };
  const html = '<script type="application/json">' + JSON.stringify({ payload }) + '</script>';
  assert.equal(parsePublicRepository(html, 'owner/repo').starter.heading, 'Quick start');
  let apiRequests = 0;
  const service = createDataService({ root, fetcher: async (url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    if (new URL(url).hostname === 'api.github.com') { apiRequests++; return new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } }); }
    return new Response(html);
  } });
  const result = await service.detail('owner/repo');
  assert.equal(result.source, 'public-page'); assert.equal(result.stars, 50); assert.equal(result.forks, 4);
  assert.equal(result.starter.heading, 'Quick start'); assert.equal(apiRequests, 1);
  payload.codeViewLayoutRoute.repo.private = true;
  assert.throws(() => parsePublicRepository('<script type="application/json">' + JSON.stringify({ payload }) + '</script>', 'owner/repo'), /公开仓库/);
});

test('reject repository identifiers that can escape API paths', () => {
  for (const value of ['../repo', 'owner/..', '//evil', 'owner/repo?x=1', 'owner/repo/contents', null]) assert.equal(validRepository(value), false);
  assert.equal(validRepository('owner/repo.name'), true);
});

test('authenticated access never caches private contributors for anonymous visitors', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openpulse-private-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let authorRequests = 0;
  const service = createDataService({ root, fetcher: async url => {
    if (new URL(url).pathname.endsWith('/contributors')) { authorRequests++; return Response.json([{ login: 'private-author' }]); }
    return Response.json({ private: true });
  } });
  await assert.rejects(service.contributors('owner/private', 'token'), /仅支持公开仓库/);
  await assert.rejects(service.contributors('owner/private'), /仅支持公开仓库/);
  assert.equal(authorRequests, 0);
});

test('trend snapshots are scoped to both language and period, persisted and reused on failure', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openpulse-data-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let failing = false; const urls = [];
  const fetcher = async url => { urls.push(String(url)); if (failing) throw new Error('offline'); return new Response(article('this week')); };
  const service = createDataService({ root, fetcher });
  const first = await service.trending({ since: 'weekly', language: 'c++' });
  assert.equal(first.source, 'live'); assert.equal(first.repositories.length, 1);
  assert.equal(first.repositories[0].forkGrowth, null); assert.equal(urls.length, 1);
  assert.equal(new URL(urls[0]).pathname, '/trending/c%2B%2B');
  await service.trending({ since: 'weekly', language: 'c++' }); assert.equal(urls.length, 1);
  failing = true;
  const restarted = createDataService({ root, fetcher });
  const backup = await restarted.trending({ since: 'weekly', language: 'c++' });
  assert.equal(backup.source, 'cached'); assert.equal(backup.generatedAt, first.generatedAt); assert.equal(backup.window, 'weekly'); assert.equal(backup.language, 'c++');
  await assert.rejects(restarted.trending({ since: 'monthly', language: 'c++' }), /offline/);
  await assert.rejects(restarted.trending({ since: 'weekly', language: 'java' }), /offline/);
});

test('repository detail uses real metadata/readme, gracefully tolerates missing optional resources', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openpulse-detail-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const markdown = '# Demo\nThis is the real documentation with enough text to be useful to readers of the project.\n\n## Quick start\nFollow these genuine setup instructions in the documentation to run the first example in a local environment.';
  const fetcher = async url => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/readme')) return Response.json({ encoding: 'base64', content: Buffer.from(markdown).toString('base64'), html_url: 'https://github.com/owner/repo/blob/main/README.md' });
    if (pathname.endsWith('/contributors')) return Response.json([{ login: 'actual-author', contributions: 123, avatar_url: 'https://github.com/actual-author.png' }]);
    if (pathname.endsWith('/contents')) return Response.json([{ name: 'examples', html_url: 'https://github.com/owner/repo/tree/main/examples' }]);
    if (pathname.endsWith('/releases/latest')) return new Response('{}', { status: 404 });
    return Response.json({ private: false, owner: { login: 'owner' }, description: 'Real description', language: 'JavaScript', stargazers_count: 123, forks_count: 45, topics: ['tools'], has_issues: true, open_issues_count: 9, homepage: 'javascript:alert(1)', pushed_at: '2026-11-01T00:00:00Z' });
  };
  const detail = await createDataService({ root, fetcher }).detail('owner/repo');
  assert.equal(detail.stars, 123); assert.equal(detail.contributors[0].login, 'actual-author');
  assert.equal(detail.starter.heading, 'Quick start'); assert.equal(detail.sections[0].heading, 'Demo');
  assert.equal(detail.homepage, null); assert.equal(detail.latestRelease, null);
  assert(detail.resources.some(r => r.title.startsWith('examples'))); assert(detail.resources.some(r => r.title.startsWith('Issues')));
  assert(!detail.resources.some(r => r.title.startsWith('Releases')));
});
