'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggleButton() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors duration-200"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {theme === 'light' ? (
                <MoonIcon className="w-6 h-6 text-[var(--icon-primary)]" />
            ) : (
                <SunIcon className="w-6 h-6 text-[var(--icon-accent)]" />
            )}
        </button>
    );
}