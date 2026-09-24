import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, type Theme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dropdown', className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const options: { id: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4 text-amber-500" />,
      desc: 'Light theme for bright rooms',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
      desc: 'Dark theme for eye comfort',
    },
    {
      id: 'system',
      label: 'System',
      icon: <Laptop className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
      desc: `Match device (${resolvedTheme})`,
    },
  ];

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 ${className}`}>
        {options.map((opt) => {
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white dark:shadow-slate-900/50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
              title={`${opt.label} Mode`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
      >
        {theme === 'light' ? (
          <Sun className="h-4 w-4 text-amber-500 transition-transform hover:rotate-45" />
        ) : theme === 'dark' ? (
          <Moon className="h-4 w-4 text-indigo-400 transition-transform hover:-rotate-12" />
        ) : (
          <Laptop className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Appearance
          </div>

          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon}
                    <div className="text-left">
                      <div className="font-bold leading-tight">{opt.label}</div>
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{opt.desc}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
