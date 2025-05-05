export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
  stargazers_count: number;
  forks_count: number;
  new_stars: number;
  new_forks: number;
  total_stars: number;
  total_forks: number;
  language: string;
  created_at: string;
  updated_at: string;
  contributors: Array<{
    login: string;
    avatar_url: string;
  }>;
}

export interface TrendingData {
  items: GitHubRepo[];
  timestamp: number;
}

export type LanguageFilter = 'all' | 'JavaScript' | 'TypeScript' | 'Python' | 'Go' | 'Swift' | 'Rust' | 'Java' | 'Kotlin';

export type TimeRange = 'daily' | 'weekly' | 'monthly';

export interface DeveloperStats {
  login: string;
  avatar_url: string;
  total_stars: number;
  total_repos: number;
  top_repos: GitHubRepo[];
} 