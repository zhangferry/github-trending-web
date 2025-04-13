'use client';

import { useState, useEffect } from 'react';
import { GitHubRepo, LanguageFilter } from '@/types/github';
import { fetchTrendingRepos, filterReposByLanguage } from '@/utils/github';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { StarIcon, CodeBracketIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTrendingRepos();
        setRepos(data);
      } catch (error) {
        console.error('Failed to fetch trending repos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  return (
    <main className="min-h-screen bg-[#161b22] text-[#f0f6fc] p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">GitHub Trending Repositories</h1>
      
      <div className="flex justify-center gap-4 mb-8">
        {(['all', 'JavaScript', 'Python', 'Go'] as LanguageFilter[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLanguage(lang)}
            className={`px-4 py-2 rounded ${
              selectedLanguage === lang
                ? 'bg-[#238636] text-white'
                : 'bg-[#21262d] hover:bg-[#30363d]'
            }`}
          >
            {lang === 'all' ? 'All Languages' : lang}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
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
      )}
    </main>
  );
}
