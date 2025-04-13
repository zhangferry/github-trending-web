export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  stargazers_count: number;
  forks_count: number;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface TrendingData {
  items: GitHubRepo[];
  timestamp: number;
}

export type LanguageFilter = 'all' | 'JavaScript' | 'Python' | 'Go'; 