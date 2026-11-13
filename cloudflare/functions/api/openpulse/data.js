// OpenPulse 数据服务 · Cloudflare Workers 移植版
// 与 src/server/openpulse-data.mjs 同构：纯解析逻辑照搬；
// fs 持久化 → KV（可选绑定），Buffer → WebAPI，AI 摘要禁用。

import seedSnapshot from "./trending-seed.json" with { type: "json" };

export const validRepository = value => typeof value === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) && !value.split("/").some(part => part === "." || part === "..");
export const githubUrl = name => `https://github.com/${name.split("/").map(encodeURIComponent).join("/")}`;
const match = (text, regex) => text.match(regex)?.[1] || "";
export function plain(text = "") {
  return text.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : "").replace(/\s+/g, " ").trim();
}
function count(text) {
  const m = plain(text).replaceAll(",", "").match(/([\d.]+)\s*([km])?/i);
  return m ? Math.round(Number(m[1]) * ({ k: 1000, m: 1000000 }[m[2]?.toLowerCase()] || 1)) : 0;
}
export function parseTrending(html) {
  return (html.match(/<article\b[\s\S]*?<\/article>/gi) || []).flatMap(article => {
    const name = match(match(article, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i), /href="\/([^"/]+\/[^"/]+)"/);
    if (!validRepository(name)) return [];
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const total = type => count(match(article, new RegExp(`href="/${escapedName}/${type}"[^>]*>([\\s\\S]*?)</a>`)));
    const builtBy = [...article.matchAll(/<img\b[^>]*alt="@([\w-]+)"[^>]*>/g)].map(m => ({ login: m[1], avatarUrl: plain(match(m[0], /src="(https:\/\/avatars\.githubusercontent\.com\/[^\"]+)"/)) || `https://github.com/${encodeURIComponent(m[1])}.png?size=64`, contributions: null }));
    return [{ fullName: name, owner: name.split("/")[0], description: plain(match(article, /<p\b[^>]*>([\s\S]*?)<\/p>/i)), language: plain(match(article, /itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\//)) || "Unknown", stars: total("stargazers"), forks: total("forks"), growth: count(match(article, /([\d,.]+[kKmM]?)\s+stars?\s+(?:today|this week|this month)/)), contributors: [...new Map(builtBy.map(author => [author.login, author])).values()].slice(0, 5), contributorsRanked: false }];
  });
}
export function forkDelta(samples, now, period) {
  const days = { daily: 1, weekly: 7, monthly: 30 }[period];
  const cutoff = now.at - days * 86400000;
  const baseline = samples.filter(s => s.at <= cutoff && s.at >= cutoff - 86400000).at(-1);
  return baseline ? now.forks - baseline.forks : null;
}
export function readmeSections(markdown, repoUrl) {
  const cleaned = markdown.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, "\n").replace(/~~~[\s\S]*?~~~/g, "\n");
  return cleaned.split(/\n(?=#{1,4} )/).map(section => {
    const heading = match(section, /^#{1,4}\s+(.+)$/m).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "");
    const body = section.replace(/^#{1,6}\s+.+$/gm, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/[*`|]/g, "");
    const text = plain(body).slice(0, 650);
    const anchor = heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, "").replace(/\s/g, "-");
    return { heading: heading || "项目概览", text, url: `${repoUrl}#${heading ? anchor : "readme"}` };
  }).filter(s => s.text.length > 55).slice(0, 30);
}
function noteworthySections(sections, starter) {
  const candidates = sections.filter(section => section !== starter && !/^(credits?|licen[cs]e|acknowledg|sponsors?|supporters?|contributors?|contributing|code of conduct|table of contents|致谢|许可证|赞助|贡献)/i.test(section.heading));
  const priority = section => /feature|capabilit|overview|why|use.case|architecture|highlights?|功能|特性|能力|场景|概览|架构/i.test(section.heading) ? 1 : 0;
  return candidates.sort((a, b) => priority(b) - priority(a)).slice(0, 3);
}
export function parsePublicRepository(html, name) {
  let payload;
  for (const script of html.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { const candidate = JSON.parse(script[1]).payload; if (candidate?.codeViewLayoutRoute?.repo) { payload = candidate; break; } } catch { /* Skip unrelated application JSON. */ }
  }
  const repo = payload?.codeViewLayoutRoute?.repo;
  if (!repo || repo.private || repo.public !== true) throw new Error("暂时无法读取公开仓库资料。");
  const about = payload.sidebarAbout || {};
  const route = payload.codeViewRepoRoute || {};
  const url = githubUrl(name);
  const overview = route.overview?.overviewFiles?.find(file => file.preferredFileType === "readme");
  const richText = overview?.richText || match(html, /(<article\b[^>]*class="[^"]*markdown-body[^\"]*"[\s\S]*?<\/article>)/);
  const markdown = richText.replace(/<pre\b[\s\S]*?<\/pre>/gi, "").replace(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, title) => `\n${"#".repeat(Number(level))} ${plain(title)}\n`).replace(/<\/(?:p|li|div|tr)>|<br\s*\/?>/gi, "\n");
  const sections = readmeSections(markdown, url);
  const starter = sections.find(s => /install|getting started|quick.?start|usage|setup|安装|快速|入门|使用/i.test(s.heading));
  const resources = [{ title: "README · 项目说明", description: "核心能力与项目使用说明", url: `${url}#readme` }];
  if (about.sections?.releases?.releaseCount) resources.push({ title: "Releases · 版本记录", description: `${about.sections.releases.releaseCount} 个公开版本，查看最近更新`, url: `${url}/releases` });
  resources.push({ title: "Issues · 使用反馈", description: "在 GitHub 查看社区反馈和讨论", url: `${url}/issues` });
  for (const item of (route.tree?.items || []).filter(item => /^(examples?|docs?|tutorials?|demos?)$/i.test(item.name)).slice(0, 3)) resources.push({ title: `${item.name} · 内容目录`, description: "仓库中公开的文档或示例", url: `${url}/tree/${encodeURIComponent(repo.defaultBranch)}/${encodeURIComponent(item.name)}` });
  const language = plain(match(html, /itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\//));
  return { fullName: name, owner: repo.ownerLogin, description: about.description || "", language: language || "Unknown", stars: about.stargazerCount ?? null, forks: about.forksCount ?? null, topics: (about.topics || []).map(topic => topic.name), license: about.repo?.license?.spdxId || null, archived: repo.isArchived, pushedAt: null, homepage: /^https?:\/\//i.test(about.website || "") ? about.website : null, contributors: [], contributorsRanked: false, sections: noteworthySections(sections, starter), starter: starter || null, resources, readmeAvailable: Boolean(richText), latestRelease: null, source: "public-page", notice: "GitHub API 暂不可用，资料来自公开仓库页面；部分统计和作者贡献次数可能暂缺。" };
}

const base64Decode = value => new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)));
const hexKey = text => [...new TextEncoder().encode(text)].map(b => b.toString(16).padStart(2, "0")).join("");

export function createDataService(env = {}) {
  const kv = env.KV || null; // 可选 KV 绑定，保存 fork 历史与最近快照
  const fetcher = fetch;
  const clock = Date.now;
  const cache = new Map();
  const pending = new Map();
  const trendingRepositories = new Map();
  let apiBlockedUntil = 0;
  let history = null;
  const cached = async (key, ttl, task) => {
    if (cache.get(key)?.until > clock()) return cache.get(key).data;
    if (pending.has(key)) return pending.get(key);
    const promise = task().then(data => { cache.set(key, { data, until: clock() + ttl }); return data; }).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
  async function api(endpoint, token) {
    if (!token && apiBlockedUntil > clock()) { const error = new Error("GitHub 匿名请求额度暂时用尽，请稍后重试。"); error.status = 429; throw error; }
    const response = await fetcher(`https://api.github.com${endpoint}`, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "OpenPulse", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!response.ok) { if (!token && (response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0")) apiBlockedUntil = Math.max(clock() + 60000, Number(response.headers.get("x-ratelimit-reset") || 0) * 1000); const error = new Error(response.status === 403 || response.status === 429 ? "GitHub 请求额度暂时用尽，请稍后重试。" : response.status === 404 ? "仓库不存在或不是公开仓库。" : `GitHub 暂时不可用（${response.status}）。`); error.status = response.status; throw error; }
    return response.status === 204 ? null : response.json();
  }
  async function publicRepository(name, token) {
    return cached(`public:${name}`, 600000, async () => {
      const repo = await api(`/repos/${name}`, token);
      if (repo.private) throw new Error("仅支持公开仓库。");
      return repo;
    });
  }
  async function publicPage(name) {
    return cached(`page:${name}`, 600000, async () => {
      const response = await fetcher(githubUrl(name), { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "OpenPulse", Accept: "text/html" } });
      if (!response.ok) { const error = new Error(response.status === 404 ? "仓库不存在或不是公开仓库。" : "GitHub 页面暂时不可用。"); error.status = response.status; throw error; }
      const result = parsePublicRepository(await response.text(), name);
      result.generatedAt = new Date(clock()).toISOString();
      return result;
    });
  }
  async function contributors(name) {
    if (!validRepository(name)) throw new Error("无效的仓库标识。");
    return cached(`authors:${name}`, 6 * 3600000, async () => {
      await publicRepository(name);
      const users = await api(`/repos/${name}/contributors?per_page=5`);
      return (users || []).slice(0, 5).map(user => ({ login: user.login, avatarUrl: user.avatar_url, contributions: user.contributions, type: user.type }));
    });
  }
  async function rememberForks(repositories, period) {
    if (!history) {
      history = {};
      if (kv) { try { history = JSON.parse((await kv.get("fork-history")) || "{}"); } catch { history = {}; } }
    }
    const at = clock();
    for (const repo of repositories) {
      const samples = history[repo.fullName] || [];
      repo.forkGrowth = forkDelta(samples, { at, forks: repo.forks }, period);
      if (!samples.length || at - samples.at(-1).at >= 3600000) samples.push({ at, forks: repo.forks });
      history[repo.fullName] = samples.filter(sample => sample.at > at - 40 * 86400000);
    }
    if (kv) kv.put("fork-history", JSON.stringify(history)).catch(() => {});
  }
  function aggregate(repositories) {
    return { newStars: repositories.reduce((sum, r) => sum + r.growth, 0), newForks: repositories.every(r => Number.isFinite(r.forkGrowth)) ? repositories.reduce((sum, r) => sum + r.forkGrowth, 0) : null, risingRepositories: repositories.length };
  }
  async function trending({ since, language } = {}) {
    const period = ["daily", "weekly", "monthly"].includes(since) ? since : "daily";
    const lang = typeof language === "string" && /^[A-Za-z0-9+# .-]{1,64}$/.test(language) ? language.toLowerCase() : "";
    const key = `${period}:${lang}`;
    return cached(`trending:${key}`, 300000, async () => {
      const snapshotKey = `snapshot:${key}`;
      try {
        const url = new URL("https://github.com/trending" + (lang ? `/${encodeURIComponent(lang)}` : ""));
        url.searchParams.set("since", period);
        const response = await fetcher(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "OpenPulse", Accept: "text/html" } });
        if (!response.ok) throw new Error(`GitHub Trending 返回 ${response.status}`);
        const html = await response.text();
        const repositories = parseTrending(html);
        repositories.forEach(repo => trendingRepositories.set(repo.fullName.toLowerCase(), repo));
        if (!repositories.length && !/It looks like we don.t have any trending repositories|no repositories|no results/i.test(html)) throw new Error("GitHub 趋势页面暂时无法解析。");
        await rememberForks(repositories, period);
        const data = { source: "live", generatedAt: new Date(clock()).toISOString(), window: period, language: lang, pulse: aggregate(repositories), repositories };
        if (kv) kv.put(snapshotKey, JSON.stringify(data)).catch(() => {});
        return data;
      } catch (error) {
        if (kv) {
          try {
            const previous = JSON.parse(await kv.get(snapshotKey));
            if (previous) return { ...previous, source: "cached", notice: "实时请求暂不可用，正在展示上次成功获取的榜单。" };
          } catch { /* fallthrough */ }
        }
        if (period === "daily" && !lang) {
          const snapshot = seedSnapshot;
          const repositories = snapshot.repositories.map(repo => ({ ...repo, owner: repo.owner || repo.fullName.split("/")[0], forkGrowth: null, contributors: [], contributorsRanked: false }));
          return { ...snapshot, window: period, language: lang, source: "cached", notice: "实时请求暂不可用，正在展示历史快照。", repositories, pulse: aggregate(repositories) };
        }
        throw error;
      }
    });
  }
  async function detail(name, token) {
    if (!validRepository(name)) throw new Error("无效的仓库标识。");
    return cached(`detail:${name}`, 600000, async () => {
      let repo;
      try { repo = await publicRepository(name, token); }
      catch (error) {
        if (error.status === 404) throw error;
        const fallback = await publicPage(name);
        const listed = trendingRepositories.get(name.toLowerCase());
        return { ...fallback, language: fallback.language === "Unknown" ? listed?.language || "Unknown" : fallback.language, contributors: cache.get(`authors:${name}`)?.data || listed?.contributors || [], contributorsNotice: "作者按 GitHub 公开展示顺序排列；贡献次数暂不可用。" };
      }
      const [readme, authors, release, contents] = await Promise.allSettled([
        api(`/repos/${name}/readme`, token), contributors(name), api(`/repos/${name}/releases/latest`, token), api(`/repos/${name}/contents`, token),
      ]);
      const url = githubUrl(name);
      const markdown = readme.status === "fulfilled" && readme.value?.encoding === "base64" ? base64Decode(readme.value.content) : "";
      const sections = readmeSections(markdown, url);
      const starter = sections.find(s => /install|getting started|quick.?start|usage|setup|安装|快速|入门|使用/i.test(s.heading));
      const noteworthy = noteworthySections(sections, starter);
      const resources = [{ title: "README · 项目说明", description: "核心能力与项目使用说明", url: readme.status === "fulfilled" && readme.value?.html_url || `${url}#readme` }];
      if (release.status === "fulfilled" && release.value) resources.push({ title: `Releases · ${release.value.tag_name}`, description: (release.value.name || "最新版本") + " · " + release.value.published_at?.slice(0, 10), url: release.value.html_url });
      if (repo.has_issues) resources.push({ title: "Issues · 真实使用反馈", description: `查看使用反馈与已知问题 · ${repo.open_issues_count} 个未关闭条目（含 PR）`, url: `${url}/issues` });
      if (contents.status === "fulfilled" && Array.isArray(contents.value)) {
        for (const item of contents.value.filter(item => /^(examples?|docs?|tutorials?|demos?)$/i.test(item.name)).slice(0, 3)) resources.push({ title: `${item.name} · ${/example|demo/i.test(item.name) ? "使用示例" : "项目文档"}`, description: "仓库中公开的内容目录", url: item.html_url });
      }
      return { fullName: name, owner: repo.owner.login, description: repo.description || "", language: repo.language || "Unknown", stars: repo.stargazers_count, forks: repo.forks_count, topics: repo.topics || [], license: repo.license?.spdx_id || null, archived: repo.archived, pushedAt: repo.pushed_at, generatedAt: new Date(clock()).toISOString(), homepage: /^https?:\/\//i.test(repo.homepage || "") ? repo.homepage : null, contributors: authors.status === "fulfilled" ? authors.value : [], contributorsRanked: true, contributorsNotice: authors.status === "rejected" ? "贡献作者暂时无法加载，可前往 GitHub 查看。" : null, sections: noteworthy, starter: starter || null, resources, readmeAvailable: Boolean(markdown), latestRelease: release.status === "fulfilled" ? release.value?.tag_name : null };
    });
  }
  return { trending, contributors, detail };
}
