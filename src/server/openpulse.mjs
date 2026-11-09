import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDataService } from './openpulse-data.mjs';
import { createSummaryService } from './openpulse-summary.mjs';
import seedSnapshot from './trending-seed.json';

export const data = createDataService({
  cacheDirectory: path.join(tmpdir(), 'github-trending-web-openpulse'),
  seedSnapshot,
});
export const summaries = createSummaryService({
  model: process.env.VERCEL ? '' : (process.env.OPENPULSE_AI_MODEL ?? 'qwen2.5:1.5b'),
});
