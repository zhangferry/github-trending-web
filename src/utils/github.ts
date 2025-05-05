import { GitHubRepo, TrendingData, TimeRange, DeveloperStats, LanguageFilter } from '@/types/github';
import { subDays, subWeeks, subMonths, format } from 'date-fns';

const CACHE_KEY = 'github_trending_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
// 如果你有 GitHub 个人访问令牌，可以在这里添加
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

console.log('GitHub Token available:', !!GITHUB_TOKEN);

function getTimeRangeQuery(timeRange: TimeRange, language: LanguageFilter = 'all'): string {
  const now = new Date();
  let dateQuery: string;
  
  switch (timeRange) {
    case 'weekly':
      dateQuery = `pushed:>${format(subWeeks(now, 1), 'yyyy-MM-dd')}`;
      break;
    case 'monthly':
      dateQuery = `pushed:>${format(subMonths(now, 1), 'yyyy-MM-dd')}`;
      break;
    default: // daily
      dateQuery = `pushed:>${format(subDays(now, 1), 'yyyy-MM-dd')}`;
  }

  const languageQuery = language === 'all' ? '' : `language:${language}`;
  const baseQuery = 'stars:>1';  // 降低到最低限制
  
  return [baseQuery, dateQuery, languageQuery].filter(Boolean).join(' ');
}

export async function fetchTrendingRepos(timeRange: TimeRange, language: LanguageFilter = 'all'): Promise<GitHubRepo[]> {
  try {
    const targetUrl = new URL('https://github-trending-iota.vercel.app/repo');
    if (language !== 'all') {
      targetUrl.searchParams.append('lang', language);
    }
    targetUrl.searchParams.append('since', timeRange);
    
    // 使用 cors-anywhere 代理
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${targetUrl.toString()}`;
    console.log('Fetching from URL:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`GitHub Trending API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.length} repositories`);
    
    const reposWithNewStats = data.map((item: any) => {
      const repoName = item.repo.split('/').pop();
      const owner = item.repo.split('/')[1];
      
      const repo: GitHubRepo = {
        id: Math.random(), // 由于API没有提供id，我们生成一个随机id
        name: repoName,
        full_name: item.repo,
        html_url: `https://github.com${item.repo}`,
        description: item.desc,
        owner: {
          login: owner,
          avatar_url: item.build_by[0].avatar
        },
        stargazers_count: item.stars,
        forks_count: item.forks,
        language: item.lang,
        created_at: '', // API没有提供这些信息
        updated_at: '',
        new_stars: item.change,
        new_forks: 0, // API没有提供forks变化信息
        total_stars: item.stars,
        total_forks: item.forks,
        contributors: item.build_by.map((contributor: any) => ({
          login: contributor.by.split('/')[1],
          avatar_url: contributor.avatar
        }))
      };
      
      console.log(`Repo: ${repo.full_name}, Total Stars: ${repo.total_stars}, New Stars: ${repo.new_stars}`);
      return repo;
    });
    
    return reposWithNewStats;
  } catch (error) {
    console.error('Error fetching trending repos:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch trending repositories. Please check your network connection and try again.');
  }
}

export async function fetchTopDevelopers(timeRange: TimeRange = 'daily'): Promise<DeveloperStats[]> {
  const repos = await fetchTrendingRepos(timeRange);
  const developerMap = new Map<string, DeveloperStats>();

  for (const repo of repos) {
    const { login, avatar_url } = repo.owner;
    if (!developerMap.has(login)) {
      developerMap.set(login, {
        login,
        avatar_url,
        total_stars: 0,
        total_repos: 0,
        top_repos: [],
      });
    }

    const stats = developerMap.get(login)!;
    stats.total_stars += repo.stargazers_count;
    stats.total_repos += 1;
    stats.top_repos.push(repo);
  }

  return Array.from(developerMap.values())
    .sort((a, b) => b.total_stars - a.total_stars)
    .slice(0, 10);
}

export function getCachedData(cacheKey: string): TrendingData | null {
  if (typeof window === 'undefined') return null;

  const cached = localStorage.getItem(cacheKey);
  if (!cached) return null;

  const data: TrendingData = JSON.parse(cached);
  const isExpired = Date.now() - data.timestamp > CACHE_DURATION;

  if (isExpired) {
    localStorage.removeItem(cacheKey);
    return null;
  }

  return data;
}

export function filterReposByLanguage(repos: GitHubRepo[], language: string): GitHubRepo[] {
  if (language === 'all') return repos;
  return repos.filter(repo => repo.language === language);
} 