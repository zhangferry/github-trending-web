import { GitHubRepo, TrendingData, TimeRange, DeveloperStats, LanguageFilter } from '@/types/github';
import { subDays, subWeeks, subMonths, format } from 'date-fns';

const CACHE_KEY = 'github_trending_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
// 如果你有 GitHub 个人访问令牌，可以在这里添加
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

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
    const query = getTimeRangeQuery(timeRange, language);
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching trending repos:', error);
    return [];
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