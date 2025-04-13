"use client";

import { useState, useEffect } from 'react';
import { fetchTrendingRepos } from '@/utils/github';
import { GitHubRepo, TimeRange, LanguageFilter } from '@/types/github';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { StarIcon, CodeBracketIcon } from '@heroicons/react/24/solid';

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
        console.log('数据验证 - 接收到的仓库数据:', data);
        console.log('数据验证 - 第一个仓库的完整信息:', data[0]);
        setRepos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadRepos();
  }, [timeRange, language]);

  // 在渲染时也验证一下数据
  console.log('数据验证 - 渲染时的 repos:', repos);
  if (repos.length > 0) {
    console.log('数据验证 - 渲染时第一个仓库的 new_stars:', repos[0].new_stars);
    console.log('数据验证 - 渲染时第一个仓库的 total_stars:', repos[0].total_stars);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-300">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-center">{error}</div>;
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
            {repos.map((repo, index) => (
              <tr key={repo.id} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {repo.full_name}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{repo.owner.login}</td>
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
                      <span className="text-xs text-gray-400 ml-1">新增</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      总计: {repo.stargazers_count.toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-blue-500">
                      <CodeBracketIcon className="w-4 h-4" />
                      <span className="font-bold text-blue-400">+{repo.new_forks}</span>
                      <span className="text-xs text-gray-400 ml-1">新增</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      总计: {repo.forks_count.toLocaleString()}
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