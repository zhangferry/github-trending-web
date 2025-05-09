import { GitHubRepo, TrendingData, TimeRange, DeveloperStats, LanguageFilter } from '@/types/github';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function fetchTrendingRepos(timeRange: TimeRange, language: LanguageFilter = 'all'): Promise<GitHubRepo[]> {
  try {
    const baseUrl = window.location.origin;
    console.log('Base URL:', baseUrl);
    
    const url = new URL('/api/trending', baseUrl);
    if (language !== 'all') {
      url.searchParams.append('lang', language);
    }
    url.searchParams.append('since', timeRange);
    
    console.log('Full request URL:', url.toString());
    
    const response = await fetch(url.toString());
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`GitHub Trending API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    console.log(`Found ${data.length} repositories`);
    
    const reposWithNewStats = data.map((item: any) => {
      const repoName = item.repo.split('/').pop();
      const owner = item.repo.split('/')[1];
      
      const repo: GitHubRepo = {
        id: Math.random(),
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
        created_at: '',
        updated_at: '',
        new_stars: item.change,
        new_forks: 0,
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
    console.error('Fetch error:', error);
    throw error;
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