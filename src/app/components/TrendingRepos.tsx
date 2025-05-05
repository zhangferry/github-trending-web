"use client";

import { useState, useEffect } from 'react';
import { fetchTrendingRepos } from '@/utils/github';
import { GitHubRepo, LanguageFilter, TimeRange } from '@/types/github';
import { StarIcon, CodeBracketIcon } from '@heroicons/react/24/solid';
import LoadingBar from './LoadingBar';
import LanguageTrend from './LanguageTrend';

const LANGUAGES: { value: LanguageFilter; label: string }[] = [
  { value: 'all', label: 'All Languages' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Java', label: 'Java' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Swift', label: 'Swift' },
  { value: 'Kotlin', label: 'Kotlin' }
];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' }
];

export default function TrendingRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [previousRepos, setPreviousRepos] = useState<GitHubRepo[]>([]);
  const [chartLanguage, setChartLanguage] = useState<LanguageFilter>('all');

  useEffect(() => {
    const loadRepos = async () => {
      try {
        setLoading(true);
        setError(null);
        setPreviousRepos(repos);
        
        const data = await fetchTrendingRepos(timeRange, language);
        setRepos(data.slice(0, 50)); // 限制为前50个仓库
        setChartLanguage(language); // 数据加载完成后更新图表语言
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
        setRepos(previousRepos);
      } finally {
        setLoading(false);
      }
    };

    loadRepos();
  }, [language, timeRange]);

  const displayRepos = repos.length > 0 ? repos : previousRepos;

  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingBar isLoading={loading} />
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                timeRange === value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageFilter)}
          className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
        >
          {LANGUAGES.map(({ value, label }) => (
            <option key={value} value={value} className="bg-gray-800">
              {label}
            </option>
          ))}
        </select>
      </div>

      <LanguageTrend repos={displayRepos} language={chartLanguage} />

      {error && (
        <div className="text-red-400 text-center mb-4">{error}</div>
      )}

      <div className="bg-gray-900 rounded-lg shadow overflow-hidden border border-gray-700">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Repository</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Language</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stars</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Forks</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {displayRepos.map((repo, index) => (
              <tr key={repo.id} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {repo.name}
                    </a>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{repo.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {repo.contributors.map((contributor, idx) => (
                      <a
                        key={idx}
                        href={`https://github.com/${contributor.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img
                            src={contributor.avatar_url}
                            alt={`${contributor.login}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                          {contributor.login}
                        </span>
                      </a>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {repo.language && (
                    <span className="inline-flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getLanguageColor(repo.language) }}
                      />
                      <span className="text-sm text-gray-300">{repo.language}</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <StarIcon className="w-4 h-4" />
                      <span className="font-bold text-yellow-400">+{repo.new_stars}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      total: {repo.stargazers_count.toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-blue-500">
                      <CodeBracketIcon className="w-4 h-4" />
                      <span className="font-bold text-blue-400">{repo.forks_count.toLocaleString()}</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getLanguageColor(language: string): string {
  const colors: { [key: string]: string } = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    'C++': '#f34b7d',
    C: '#555555',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Vue: '#41b883',
    HTML: '#e34c26',
    CSS: '#563d7c',
  };
  return colors[language] || '#8b949e';
} 