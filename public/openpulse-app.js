const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const compact = value => !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const exact = value => Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '暂无数据';
const date = value => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未知';
const repoUrl = name => `https://github.com/${name.split('/').map(encodeURIComponent).join('/')}`;
const profile = name => `https://github.com/${encodeURIComponent(name)}`;
const validName = name => /^[\w.-]+\/[\w.-]+$/.test(name || '');
const safeUrl = url => /^https?:\/\//i.test(url || '') ? escape(url) : '#';
const colors = { TypeScript: '#5d83d6', Python: '#e3b65a', Rust: '#ba816a', Go: '#65b3c2', JavaScript: '#d4bd59', HTML: '#d38972', CSS: '#9a89c1', Swift: '#df9771' };
const periodLabels = { daily: '今日', weekly: '本周', monthly: '本月' };
const windows = { daily: '过去 24 小时', weekly: '过去 7 天', monthly: '过去 30 天' };
let activePeriod = 'daily';
let activeLanguage = '';
let trend = null;
let trendKey = '';
let homeRequest = 0;
let detailRequest = 0;
let previousScroll = 0;
async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || '请求暂时失败，请稍后重试。'); error.status = response.status; throw error; }
  return data;
}
function routeHash(name) {
  const params = new URLSearchParams({ period: activePeriod });
  if (activeLanguage) params.set('language', activeLanguage);
  if (name) params.set('repo', name);
  return `#${params}`;
}
function avatars(contributors, ranked) {
  if (!contributors?.length) return '<span>作者暂不可用 · 详情页可查看贡献者</span>';
  return `<span class="author-label">贡献作者</span><div class="author-stack">${contributors.slice(0, 5).map(author => `<a href="${profile(author.login)}" target="_blank" rel="noreferrer" title="${escape(author.login)}${Number.isFinite(author.contributions) ? ` · ${exact(author.contributions)} 次贡献` : ''}" aria-label="查看 ${escape(author.login)} 的 GitHub 主页"><img src="${safeUrl(author.avatarUrl)}" alt="${escape(author.login)}" loading="lazy" referrerpolicy="no-referrer"></a>`).join('')}</div><span>${ranked ? '按贡献排序 · 前 ' + contributors.length + ' 位' : 'GitHub 推荐 · 最多 5 位'}</span>`;
}
function renderRows() {
  if (!trend.repositories.length) { $('rows').innerHTML = '<div class="state">这个时间范围暂无该语言的上榜项目。<br>换一种语言，看看其他开发者正在关注什么。</div>'; return; }
  $('rows').innerHTML = trend.repositories.map((repo, index) => {
    const [owner, name] = repo.fullName.split('/');
    const href = routeHash(repo.fullName);
    return `<article class="row"><a class="row-link" href="${escape(href)}" aria-label="了解 ${escape(repo.fullName)}"></a><span class="rank${index < 3 ? ' top' : ''}">${String(index + 1).padStart(2, '0')}</span><div><div class="repo-title"><a class="owner" href="${profile(owner)}" target="_blank" rel="noreferrer">${escape(owner)}</a><span class="slash">/</span><a href="${escape(href)}"><b>${escape(name)}</b></a></div><p class="repo-desc">${escape(repo.description || '仓库尚未提供项目简介。')}</p><div class="meta"><span class="lang"><i style="background:${colors[repo.language] || '#a4b2c7'}"></i>${escape(repo.language === 'Unknown' ? '未标注语言' : repo.language)}</span></div><div class="authors" data-authors="${escape(repo.fullName)}">${avatars(repo.contributors, repo.contributorsRanked)}</div></div><div class="count" title="${exact(repo.stars)} Star；${windows[activePeriod]}新增 ${exact(repo.growth)}">${compact(repo.stars)}<small>+${compact(repo.growth)}</small></div><div class="count" title="${exact(repo.forks)} Fork">${compact(repo.forks)}</div></article>`;
  }).join('');
}
function renderBoardContext() {
  const repositories = trend.repositories;
  $('listHeading').textContent = `${repositories.length} 个项目`;
  $('listCount').textContent = `已展示全部 ${repositories.length} 个上榜项目`;
  const langs = [...repositories.reduce((map, repo) => map.set(repo.language, (map.get(repo.language) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
  $('languages').innerHTML = langs.slice(0, 6).map(([language, value]) => `<div class="language-row"><div class="language-label"><span><i style="background:${colors[language] || '#a4b2c7'}"></i>${escape(language === 'Unknown' ? '未标注语言' : language)}</span><span>${Math.round(value / repositories.length * 100)}%</span></div><div class="track"><i style="width:${value / repositories.length * 100}%;background:${colors[language] || '#a4b2c7'}"></i></div></div>`).join('') || '<p class="about">当前筛选暂无数据。</p>';
  $('growthWindow').textContent = periodLabels[activePeriod];
  $('movers').innerHTML = [...repositories].sort((a, b) => b.growth - a.growth).slice(0, 3).map((repo, index) => `<div class="mover"><span class="mover-num">0${index + 1}</span><div><a class="mover-name" href="${escape(routeHash(repo.fullName))}">${escape(repo.fullName)}</a><div class="mover-desc"><span>+${exact(repo.growth)} Star</span>${escape(repo.language)}</div></div></div>`).join('');
  $('sourceLabel').textContent = `数据来源 · GitHub Trending${trend.source === 'live' ? '' : ' 历史快照'}`;
  $('dataNotice').hidden = trend.source === 'live';
  $('dataNotice').textContent = `${trend.notice || ''} 数据时间：${date(trend.generatedAt)}。`;
  const upstream = new URL('https://github.com/trending' + (activeLanguage ? '/' + encodeURIComponent(activeLanguage) : '')); upstream.searchParams.set('since', activePeriod); $('upstreamLink').href = upstream;
}
function syncFilters() {
  document.querySelectorAll('[data-period]').forEach(button => { button.classList.toggle('active', button.dataset.period === activePeriod); button.setAttribute('aria-pressed', String(button.dataset.period === activePeriod)); });
  document.querySelectorAll('[data-language]').forEach(button => { button.classList.toggle('active', button.dataset.language === activeLanguage); button.setAttribute('aria-pressed', String(button.dataset.language === activeLanguage)); });
  $('languageSelect').value = [...$('languageSelect').options].some(option => option.value === activeLanguage) ? activeLanguage : '';
}
async function enrichAuthors(repositories, request) {
  const names = repositories.map(repo => repo.fullName);
  // Batches keep upstream requests bounded and render authors progressively.
  for (let start = 0; start < names.length; start += 6) {
    if (request !== homeRequest) return;
    try {
      const authors = await api('/api/openpulse/contributors?' + new URLSearchParams({ repositories: names.slice(start, start + 6).join(',') }));
      if (request !== homeRequest) return;
      for (const repo of repositories) if (authors[repo.fullName]?.ranked) {
        repo.contributors = authors[repo.fullName].contributors; repo.contributorsRanked = true;
        const node = [...document.querySelectorAll('[data-authors]')].find(node => node.dataset.authors === repo.fullName);
        if (node) node.innerHTML = avatars(repo.contributors, true);
      }
    } catch { /* Retain the real contributor avatars supplied by Trending. */ }
  }
}
async function loadTrending() {
  const request = ++homeRequest;
  const period = activePeriod; const language = activeLanguage;
  syncFilters(); $('rows').innerHTML = '<div class="state" aria-busy="true">正在读取 GitHub 趋势…</div>'; $('dataNotice').hidden = true;
  try {
    const data = await api('/api/openpulse/trending?' + new URLSearchParams({ since: period, language }));
    if (request !== homeRequest) return;
    trend = data; trendKey = period + ':' + language;
    renderRows(); renderBoardContext();
    enrichAuthors(data.repositories, request);
  } catch (error) {
    if (request !== homeRequest) return;
    $('rows').innerHTML = `<div class="state">${escape(error.message)}<br><button class="secondary-link" data-retry="home">重新加载</button></div>`;
    $('listHeading').textContent = ''; $('listCount').textContent = '暂未获取到榜单'; $('movers').innerHTML = ''; $('languages').innerHTML = '';
  }
}
function people(authors) {
  return authors.map(author => `<div class="person-wrap"><a class="person" href="${profile(author.login)}" target="_blank" rel="noreferrer"><img src="${safeUrl(author.avatarUrl)}" alt="${escape(author.login)}" referrerpolicy="no-referrer"><div class="person-name">${escape(author.login)}<small>${Number.isFinite(author.contributions) ? exact(author.contributions) + ' 次贡献' : '贡献作者'}${author.type === 'Bot' ? ' · Bot' : ''}</small></div></a></div>`).join('');
}

const summaryLabels = { purpose: '解决什么问题', audience: '适合谁', gettingStarted: '如何开始', limitations: '使用前要注意' };
async function loadSummary(button) {
  const status = $('aiStatus');
  const output = $('aiOutput');
  button.disabled = true;
  status.textContent = '正在整理仓库资料，首次生成可能需要一点时间…';
  try {
    const data = await api('/api/openpulse/summary?' + new URLSearchParams({ repository: button.dataset.summary }), { method: 'POST' });
    if (!button.isConnected || $('detailView').hidden) return;
    if (data.status !== 'ready') {
      status.textContent = ({ insufficient: '仓库资料不足，先查看下方原文。', busy: '正在生成另一个项目的解读，请稍后重试。', disabled: 'AI 解读暂未启用。' })[data.status] || 'AI 解读暂不可用，仍可阅读下方仓库原文。';
      return;
    }
    output.innerHTML = data.items.map(item => `<div class="ai-point"><h3>${escape(summaryLabels[item.field])}</h3><p>${escape(item.text)}</p><a class="source-link" href="${safeUrl(item.source.url)}" target="_blank" rel="noreferrer">来源：${escape(item.source.title)} ↗</a></div>`).join('');
    status.textContent = 'AI 根据公开仓库资料生成 · 请以原文为准';
    $('readmeExtracts').open = false;
    button.hidden = true;
  } catch {
    if (button.isConnected) status.textContent = 'AI 解读暂不可用，仍可阅读下方仓库原文。';
  } finally { button.disabled = false; }
}

function renderDetail(repo) {
  repo = { ...repo, language: repo.language === 'Unknown' ? '未标注语言' : repo.language };
  const [owner, name] = repo.fullName.split('/'); const url = repoUrl(repo.fullName);
  const current = trendKey === activePeriod + ':' + activeLanguage ? trend?.repositories.find(r => r.fullName.toLowerCase() === repo.fullName.toLowerCase()) : null;
  const section = (item, index) => `<div class="value-item"><span class="value-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escape(item.heading)}</h3><p>${escape(item.text)}${item.text.length >= 650 ? '…' : ''}</p><a class="source-link" href="${safeUrl(item.url)}" target="_blank" rel="noreferrer">来源：仓库 README ↗</a></div></div>`;
  $('detailView').innerHTML = `<div class="breadcrumb"><a href="${escape(routeHash())}" data-back>← 返回趋势榜单</a><span>/</span><span>${escape(owner)}</span><span>/</span><span>${escape(name)}</span></div>${repo.notice ? `<div class="notice" role="status">${escape(repo.notice)}</div>` : ''}
  <section class="detail-hero"><div><a class="detail-owner" href="${profile(owner)}" target="_blank" rel="noreferrer"><img src="${profile(owner)}.png?size=64" alt="">${escape(owner)} ↗</a><h1>${escape(name)}</h1><p class="detail-summary">${escape(repo.description || '仓库尚未提供项目简介。')}</p><div class="detail-tags"><span>${escape(repo.language)}</span>${repo.topics.slice(0, 5).map(topic => `<span>${escape(topic)}</span>`).join('')}${repo.archived ? '<span>已归档</span>' : ''}</div></div><div class="detail-actions"><a class="primary-link" href="${url}" target="_blank" rel="noreferrer">访问原仓库 ↗</a></div></section>
  <div class="detail-facts"><span>Star <b>${compact(repo.stars)}</b>${current ? `<small>+${compact(current.growth)} ${periodLabels[activePeriod]}</small>` : ''}</span><span>Fork <b>${compact(repo.forks)}</b></span><span>主要语言 <b>${escape(repo.language)}</b></span>${repo.license ? `<span>许可证 <b>${escape(repo.license)}</b></span>` : ''}<span>代码更新 <b style="font-size:11px;font-weight:400">${escape(date(repo.pushedAt))}</b></span></div>
  <div class="detail-grid"><article class="reading"><nav class="detail-tabs"><a href="#" data-section="why">为什么值得关注</a><a href="#" data-section="read">推荐阅读</a><a href="#" data-section="start">如何开始</a></nav><section id="why" class="detail-section"><div class="section-kicker">THE QUICK TAKE</div><h2>从项目本身，了解它的价值。</h2><div class="takeaway"><p>${escape(repo.description || '从仓库公开说明中，了解项目解决的问题与适用场景。')}</p></div>${repo.aiAvailable && repo.readmeAvailable ? `<div class="ai-card"><div class="ai-heading"><h3>AI 项目解读</h3><button class="secondary-link" data-summary="${escape(repo.fullName)}">生成解读</button></div><p id="aiStatus" role="status">从用途、适用场景、上手和限制四个角度阅读项目。</p><div id="aiOutput"></div></div>` : ''}<details id="readmeExtracts" class="readme-extracts" open><summary>仓库 README 节选</summary>${repo.sections.length ? repo.sections.map(section).join('') : `<p>${repo.readmeAvailable ? 'README 暂无适合摘录的文字段落。' : 'README 暂时无法获取。'}可前往仓库查看项目说明。</p><a class="source-link" href="${url}#readme" target="_blank" rel="noreferrer">阅读原始 README ↗</a>`}</details></section>
  <hr class="section-separator"><section id="read" class="detail-section"><div class="section-kicker">WORTH YOUR TIME</div><h2>从这些内容开始读。</h2><p>结合仓库公开文档、版本记录和内容目录，找到下一步。</p>${repo.resources.map(item => `<a class="resource" href="${safeUrl(item.url)}" target="_blank" rel="noreferrer"><div><strong>${escape(item.title)}</strong><span>${escape(item.description)}</span></div><span class="arrow">↗</span></a>`).join('')}</section>
  <hr class="section-separator"><section id="start" class="detail-section"><div class="section-kicker">TRY IT YOURSELF</div><h2>先跑通一个小示例。</h2>${repo.starter ? section(repo.starter, 0) : '<p>仓库说明中尚未找到独立的入门章节。建议先阅读 README 的安装要求与使用说明，再尝试适合自己的小任务。</p>'}<a class="source-link" href="${safeUrl(repo.starter?.url || url + '#readme')}" target="_blank" rel="noreferrer">查看完整安装与使用说明 ↗</a></section></article>
  <div class="detail-sidebar"><h3>一起构建它的人</h3><p>${repo.contributorsRanked === false ? 'GitHub 展示顺序' : '按贡献排序'} · 最多 5 位作者<br>点击作者查看 GitHub 主页。</p><div class="author-people">${people(repo.contributors)}</div>${repo.contributorsNotice ? `<p>${escape(repo.contributorsNotice)}</p>` : !repo.contributors.length ? '<p>当前没有可展示的贡献作者。</p>' : ''}<a class="source-link" style="margin-top:12px" href="${url}/graphs/contributors" target="_blank" rel="noreferrer">查看全部贡献者 ↗</a><hr class="aside-divider"><h3>项目动态</h3><p>${repo.pushedAt ? '最近代码更新：' + escape(date(repo.pushedAt)) + '<br>' : ''}${repo.latestRelease ? '最新版本：' + escape(repo.latestRelease) : repo.source === 'public-page' ? '最新更新请查看仓库版本记录。' : '暂无可展示的正式版本'}${repo.archived ? '<br>此仓库已归档，维护可能已停止。' : ''}</p>${repo.homepage ? `<a class="source-link" href="${safeUrl(repo.homepage)}" target="_blank" rel="noreferrer">项目主页 ↗</a>` : ''}<hr class="aside-divider"><h3>阅读提示</h3><p>项目资料来自 GitHub 公开仓库。AI 解读仅供参考，实际能力、安装要求和限制请以完整文档为准。</p><div class="detail-disclaimer">资料获取于 ${escape(date(repo.generatedAt))}<br>来源 · GitHub 仓库元信息与 README</div></div></div><footer><span>OpenPulse · 发现项目，也理解项目。</span><a href="${escape(routeHash())}" data-back>返回趋势榜单 ↑</a></footer>`;
  document.title = `${name} · 项目解读 · OpenPulse`;
}
async function openDetail(name) {
  const request = ++detailRequest;
  $('detailView').innerHTML = `<div class="breadcrumb"><a href="${escape(routeHash())}" data-back>← 返回趋势榜单</a></div><div class="state" aria-busy="true">正在读取项目资料、README 与贡献作者…</div>`;
  try {
    const repo = await api('/api/openpulse/repository?' + new URLSearchParams({ repository: name }));
    if (request !== detailRequest) return;
    renderDetail(repo);
  } catch (error) {
    if (request !== detailRequest) return;
    $('detailView').innerHTML = `<div class="breadcrumb"><a href="${escape(routeHash())}" data-back>← 返回趋势榜单</a></div><div class="state">${escape(error.message)}<br><button class="secondary-link" data-retry="detail" data-name="${escape(name)}">重新加载</button> <a class="primary-link" href="${repoUrl(name)}" target="_blank" rel="noreferrer">访问原仓库 ↗</a></div>`;
  }
}
function route() {
  homeRequest++;
  const params = new URLSearchParams(location.hash.slice(1));
  const name = params.get('repo');
  activePeriod = Object.hasOwn(periodLabels, params.get('period')) ? params.get('period') : 'daily';
  activeLanguage = params.get('language') || '';
  syncFilters();
  if (name && validName(name)) {
    if (!$('homeView').hidden) previousScroll = window.scrollY;
    $('homeView').hidden = true; $('detailView').hidden = false;
    window.scrollTo(0, 0); openDetail(name);
  } else {
    detailRequest++; $('homeView').hidden = false; $('detailView').hidden = true;
    document.title = 'OpenPulse · 开源趋势';
    if (!trend || trendKey !== activePeriod + ':' + activeLanguage) loadTrending();
    else { renderRows(); renderBoardContext(); }
    window.scrollTo(0, previousScroll);
  }
}
function setFilter(period, language) {
  activePeriod = period; activeLanguage = language; previousScroll = 0;
  const hash = routeHash();
  if (location.hash === hash) loadTrending(); else location.hash = hash;
}
document.addEventListener('click', event => {
  const summary = event.target.closest('[data-summary]'); if (summary) { loadSummary(summary); return; }
  const period = event.target.closest('[data-period]'); if (period) { setFilter(period.dataset.period, activeLanguage); return; }
  const language = event.target.closest('[data-language]'); if (language) { setFilter(activePeriod, language.dataset.language); return; }
  const retry = event.target.closest('[data-retry]'); if (retry) { retry.dataset.retry === 'home' ? loadTrending() : openDetail(retry.dataset.name); return; }
  const section = event.target.closest('[data-section]'); if (section) { event.preventDefault(); $(section.dataset.section)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
});
$('languageSelect').addEventListener('change', event => setFilter(activePeriod, event.target.value));
window.addEventListener('hashchange', route);
route();
