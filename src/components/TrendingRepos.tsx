import { useState, useEffect } from 'react';
import { fetchTrendingRepos } from '@/utils/github';
import { GitHubRepo, TimeRange, LanguageFilter } from '@/types/github';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: '今天' },
  { value: 'weekly', label: '本周' },
  { value: 'monthly', label: '本月' },
];

const LANGUAGES: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Go', label: 'Go' },
  { value: 'Swift', label: 'Swift' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Java', label: 'Java' },
  { value: 'Kotlin', label: 'Kotlin' },
];

export default function TrendingRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [language, setLanguage] = useState<LanguageFilter>('all');

  useEffect(() => {
    const loadRepos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTrendingRepos(timeRange, language);
        setRepos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadRepos();
  }, [timeRange, language]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex gap-2">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`px-4 py-2 rounded-lg ${
                timeRange === value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageFilter)}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {repo.full_name}
                  </a>
                </h2>
                <p className="text-gray-600 mb-4">{repo.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
                  <span>🔀 {repo.forks_count.toLocaleString()}</span>
                  <span>
                    🕒 更新于{' '}
                    {formatDistanceToNow(new Date(repo.updated_at), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                  {repo.language && (
                    <span className="inline-flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-1"
                        style={{
                          backgroundColor: getLanguageColor(repo.language),
                        }}
                      />
                      {repo.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Go: '#00ADD8',
    Swift: '#F05138',
    Rust: '#DEA584',
    Java: '#b07219',
    Kotlin: '#A97BFF',
  };
  return colors[language] || '#8e8e8e';
} 