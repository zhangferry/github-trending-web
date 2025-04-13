"use client";

import { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading: boolean;
}

export default function LoadingBar({ isLoading }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 组件挂载时的初始化
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let intervalId: NodeJS.Timeout;
    let hideTimeoutId: NodeJS.Timeout;
    
    const startLoading = () => {
      setVisible(true);
      setProgress(0);
      
      // 使用 requestAnimationFrame 来确保状态更新和动画同步
      requestAnimationFrame(() => {
        intervalId = setInterval(() => {
          setProgress(prev => {
            if (prev < 80) {
              const increment = Math.max(1, 10 * (1 - prev / 100));
              return Math.min(80, prev + increment);
            }
            return prev;
          });
        }, 100);
      });
    };

    const finishLoading = () => {
      clearInterval(intervalId);
      setProgress(100);
      
      hideTimeoutId = setTimeout(() => {
        setVisible(false);
        setProgress(0); // 重置进度，为下次加载做准备
      }, 300);
    };

    if (isLoading) {
      startLoading();
    } else {
      finishLoading();
    }

    return () => {
      clearInterval(intervalId);
      clearTimeout(hideTimeoutId);
    };
  }, [isLoading, mounted]);

  if (!visible && !isLoading) return null;

  return (
    <div 
      className="fixed top-0 left-0 w-full h-1 bg-gray-800/50 z-50"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        transform: 'translateZ(0)' // 启用硬件加速
      }}
    >
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          transition: visible ? 'width 0.3s ease-in-out' : 'none',
          background: 'linear-gradient(to right, #93C5FD, #60A5FA)',
          boxShadow: '0 0 12px rgba(147, 197, 253, 0.6)'
        }}
      />
    </div>
  );
} 