import { GitHubRepo, TrendingData } from '@/types/github';

const CACHE_KEY = 'github_trending_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function fetchTrendingRepos(): Promise<GitHubRepo[]> {
  const cachedData = getCachedData();
  if (cachedData) {
    return cachedData.items;
  }

  const response = await fetch(
    'https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=50'
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch trending repositories');
  }

  const data = await response.json();
  const trendingData: TrendingData = {
    items: data.items,
    timestamp: Date.now(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(trendingData));
  return data.items;
}

export function getCachedData(): TrendingData | null {
  if (typeof window === 'undefined') return null;

  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const data: TrendingData = JSON.parse(cached);
  const isExpired = Date.now() - data.timestamp > CACHE_DURATION;

  if (isExpired) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return data;
}

export function filterReposByLanguage(repos: GitHubRepo[], language: string): GitHubRepo[] {
  if (language === 'all') return repos;
  return repos.filter(repo => repo.language === language);
} 