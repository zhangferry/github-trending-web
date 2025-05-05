"use client";

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { GitHubRepo } from '@/types/github';

interface LanguageTrendProps {
  repos: GitHubRepo[];
  language: string;
}

interface RepoStats {
  name: string;
  stars: number;
  color: string;
}

export default function LanguageTrend({ repos, language }: LanguageTrendProps) {
  const chartData = useMemo(() => {
    if (language === 'all') {
      // 显示语言趋势
      const stats = new Map<string, RepoStats>();

      repos.forEach(repo => {
        if (!repo.language) return;

        const existing = stats.get(repo.language) || {
          name: repo.language,
          stars: 0,
          color: getLanguageColor(repo.language)
        };

        existing.stars += repo.new_stars;
        stats.set(repo.language, existing);
      });

      return Array.from(stats.values())
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 10);
    } else {
      // 显示该语言下仓库的 star 变化
      return repos
        .filter(repo => repo.language === language)
        .map(repo => ({
          name: repo.name,
          stars: repo.new_stars,
          color: getLanguageColor(language)
        }))
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 10);
    }
  }, [repos, language]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
      <h3 className="text-gray-300 text-lg mb-4">
        {language === 'all' ? 'Language Trending' : `Top 10 ${language} Repositories`}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={formatNumber}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              color: '#D1D5DB'
            }}
            formatter={(value: number) => [`${formatNumber(value)} stars`, '']}
            cursor={{ fill: '#374151', opacity: 0.2 }}
          />
          <Bar
            dataKey="stars"
            fill="#60A5FA"
            radius={[0, 4, 4, 0]}
            barSize={24}
            label={{
              position: 'right',
              fill: '#9CA3AF',
              formatter: (value: number) => formatNumber(value)
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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