"use client";

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { GitHubRepo } from '@/types/github';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StarsChartProps {
  repos: GitHubRepo[];
}

export default function StarsChart({ repos }: StarsChartProps) {
  const chartData = useMemo(() => {
    // 获取前10个仓库
    const top10Repos = repos.slice(0, 10);
    
    // 生成过去7天的数据
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'M月d日', { locale: zhCN });
    });
    
    return days.map(day => {
      const data: { [key: string]: number | string } = { name: day };
      
      // 为每个仓库生成模拟的每日数据
      top10Repos.forEach(repo => {
        const baseStars = Math.round(repo.new_stars / 7); // 平均每日新增数
        const variance = baseStars * 0.3; // 30% 的波动范围
        const randomStars = Math.max(0,
          Math.round(baseStars + (Math.random() * 2 - 1) * variance)
        );
        data[repo.name] = randomStars;
      });
      
      return data;
    });
  }, [repos]);

  const colors = [
    '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
    '#F87171', '#818CF8', '#2DD4BF', '#FB923C', '#C084FC'
  ];

  return (
    <div className="w-full h-80 bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
      <h3 className="text-gray-300 text-lg mb-4">每日 Stars 趋势</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              color: '#D1D5DB'
            }}
            formatter={(value: number) => [`${value} stars`, '']}
            labelFormatter={(label: string) => `${label}`}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: '1rem',
              color: '#D1D5DB'
            }}
          />
          {repos.slice(0, 10).map((repo, index) => (
            <Line
              key={repo.name}
              type="monotone"
              dataKey={repo.name}
              name={`${repo.name} (总计: ${repo.new_stars})`}
              stroke={colors[index]}
              strokeWidth={2}
              dot={{ fill: colors[index] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 