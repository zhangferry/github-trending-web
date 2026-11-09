import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSummaryService } from '../src/server/openpulse-summary.mjs';

const repo = { fullName: 'owner/project', description: 'A tool for finding files', readmeAvailable: true,
  sections: [{ heading: 'Usage', text: 'Pass a directory to locate files.', url: 'https://github.com/owner/project#usage' }] };
const reply = value => Response.json({ message: { content: JSON.stringify(value) } });

test('generates structured notes with original source URLs and shares work for unchanged evidence', async () => {
  let calls = 0;
  const service = createSummaryService({ model: 'local-test', fetcher: async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(JSON.parse(options.body).model, 'local-test');
    return reply({ purpose: { text: '这个项目用于按目录查找文件。', source: 1, url: 'https://untrusted.example' },
      gettingStarted: { text: '传入需要查找文件的目录。', source: 2 }, limitations: { text: '资料没有提到任何限制。', source: 99 } });
  } });
  const [first, second] = await Promise.all([service.summarize(repo), service.summarize(repo)]);
  assert.equal(first.status, 'ready');
  assert.deepEqual(second, first);
  assert.deepEqual(first.items.map(item => item.source.url), ['https://github.com/owner/project', repo.sections[0].url]);
  assert.equal((await service.summarize(repo)).status, 'ready');
  assert.equal(calls, 1);
  await service.summarize({ ...repo, description: 'Updated evidence' });
  assert.equal(calls, 2);
});

test('falls back for unavailable models, missing README, and unsupported model output', async () => {
  const disabled = createSummaryService();
  assert.deepEqual(await disabled.summarize(repo), { status: 'disabled' });
  const unavailable = createSummaryService({ model: 'local-test', fetcher: async () => new Response(null, { status: 503 }) });
  assert.deepEqual(await unavailable.summarize({ ...repo, readmeAvailable: false }), { status: 'insufficient' });
  assert.deepEqual(await unavailable.summarize(repo), { status: 'unavailable' });
  const bad = createSummaryService({ model: 'local-test', fetcher: async () => reply({ purpose: { text: 'A tool for finding files', source: 1 } }) });
  assert.deepEqual(await bad.summarize(repo), { status: 'unavailable' });
});
