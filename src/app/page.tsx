'use client';

import { useState, useEffect } from 'react';
import { GitHubRepo, LanguageFilter, TimeRange, DeveloperStats } from '@/types/github';
import { fetchTrendingRepos, filterReposByLanguage, fetchTopDevelopers } from '@/utils/github';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { StarIcon, CodeBracketIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [developers, setDevelopers] = useState<DeveloperStats[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageFilter>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('daily');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'repos' | 'developers'>('repos');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reposData, developersData] = await Promise.all([
          fetchTrendingRepos(selectedTimeRange),
          fetchTopDevelopers(selectedTimeRange)
        ]);
        setRepos(reposData);
        setDevelopers(developersData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  const filteredRepos = filterReposByLanguage(repos, selectedLanguage);
  const top10Repos = repos.slice(0, 10);

  const languageStats = repos.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const languageData = Object.entries(languageStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const languages: LanguageFilter[] = [
    'all',
    'JavaScript',
    'TypeScript',
    'Python',
    'Go',
    'Swift',
    'Rust',
    'Java',
    'Kotlin'
  ];

  return (
    <main className="min-h-screen bg-[#161b22] text-[#f0f6fc] p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">GitHub Trending</h1>
      
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setView('repos')}
            className={`px-4 py-2 rounded ${
              view === 'repos'
                ? 'bg-[#238636] text-white'
                : 'bg-[#21262d] hover:bg-[#30363d]'
            }`}
          >
            Repositories
          </button>
          <button
            onClick={() => setView('developers')}
            className={`px-4 py-2 rounded ${
              view === 'developers'
                ? 'bg-[#238636] text-white'
                : 'bg-[#21262d] hover:bg-[#30363d]'
            }`}
          >
            Developers
          </button>
        </div>

        <div className="flex justify-center gap-4">
          {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded ${
                selectedTimeRange === range
                  ? 'bg-[#238636] text-white'
                  : 'bg-[#21262d] hover:bg-[#30363d]'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {view === 'repos' && (
          <div className="flex justify-center gap-2 flex-wrap">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedLanguage === lang
                    ? 'bg-[#238636] text-white'
                    : 'bg-[#21262d] hover:bg-[#30363d]'
                }`}
              >
                {lang === 'all' ? 'All Languages' : lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="bg-[#21262d] p-6 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 text-red-400 mb-4">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <h2 className="text-xl font-bold">Error Loading Data</h2>
          </div>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#238636] text-white rounded hover:bg-[#2ea043]"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="text-center">Loading...</div>
      ) : view === 'repos' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#21262d] p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Top 10 Repositories Trend</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={top10Repos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="stargazers_count" stroke="#1f6feb" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#21262d] p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Language Distribution</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f0883e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-[#21262d] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#161b22]">
                  <th className="p-4 text-left">Rank</th>
                  <th className="p-4 text-left">Repository</th>
                  <th className="p-4 text-left">Author</th>
                  <th className="p-4 text-left">Language</th>
                  <th className="p-4 text-left">Stars</th>
                  <th className="p-4 text-left">Forks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepos.map((repo, index) => (
                  <tr key={repo.id} className="border-t border-[#30363d]">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4">
                      <a
                        href={`https://github.com/${repo.full_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1f6feb] hover:underline"
                      >
                        {repo.name}
                      </a>
                    </td>
                    <td className="p-4">{repo.owner.login}</td>
                    <td className="p-4">{repo.language || 'N/A'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        {repo.stargazers_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <CodeBracketIcon className="w-4 h-4 text-blue-400" />
                        {repo.forks_count.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((dev, index) => (
            <div key={dev.login} className="bg-[#21262d] p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={dev.avatar_url}
                  alt={dev.login}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-bold">{dev.login}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <StarIcon className="w-4 h-4" />
                    <span>{dev.total_stars.toLocaleString()} stars</span>
                    <CodeBracketIcon className="w-4 h-4 ml-2" />
                    <span>{dev.total_repos} repos</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Top Repositories:</h4>
                {dev.top_repos.slice(0, 3).map((repo) => (
                  <a
                    key={repo.id}
                    href={`https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-[#1f6feb] hover:underline"
                  >
                    {repo.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
