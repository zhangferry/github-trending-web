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
}

interface LanguageStats {
  name: string;
  stars: number;
  repos: number;
  color: string;
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

export default function LanguageTrend({ repos }: LanguageTrendProps) {
  const languageStats = useMemo(() => {
    const stats = new Map<string, LanguageStats>();

    // 统计每种语言的数据
    repos.forEach(repo => {
      if (!repo.language) return;

      const existing = stats.get(repo.language) || {
        name: repo.language,
        stars: 0,
        repos: 0,
        color: getLanguageColor(repo.language)
      };

      existing.stars += repo.new_stars;
      existing.repos += 1;
      stats.set(repo.language, existing);
    });

    // 转换为数组并排序
    return Array.from(stats.values())
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 10); // 只取前10种语言
  }, [repos]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="w-full h-96 bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
      <h3 className="text-gray-300 text-lg mb-4">Weekly Language Trending</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={languageStats}
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
            formatter={(value: number, name: string, props: any) => [
              `${formatNumber(value)} stars (${props.payload.repos} repos)`,
              props.payload.name
            ]}
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
            {languageStats.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 