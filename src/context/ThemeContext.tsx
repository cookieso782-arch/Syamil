import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeTemplate, TextSize } from '../types/index.ts';

interface ThemeContextType {
  template: ThemeTemplate;
  setTemplate: (t: ThemeTemplate) => void;
  isDark: boolean;
  toggleDark: () => void;
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  themeConfig: {
    name: string;
    description: string;
    primaryBg: string;
    cardBg: string;
    accentColor: string;
    textColor: string;
    badgeStyle: string;
    buttonPrimary: string;
    navStyle: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_TEMPLATES: Record<ThemeTemplate, {
  name: string;
  description: string;
  previewColor: string;
}> = {
  emerald: {
    name: 'Emerald Baitullah',
    description: 'Nuansa Hijau Islami Modern & Emas Elegan - Bersih, Segar, dan Anggun',
    previewColor: '#059669',
  },
  sapphire: {
    name: 'Midnight Sapphire',
    description: 'Biru Navy Profesional & Elegan - Tegas, Modern, dan Presisi Tinggi',
    previewColor: '#1E3A8A',
  },
  minimal: {
    name: 'Clean Minimalist',
    description: 'Monokrom Slate Bersih & Kontras Tinggi - Sangat Mudah Dibaca Awam',
    previewColor: '#334155',
  },
  sand: {
    name: 'Warm Terakota / Sand',
    description: 'Warna Bumi Hangat & Ramah - Menenangkan dan Natural',
    previewColor: '#D97706',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [template, setTemplateState] = useState<ThemeTemplate>(() => {
    return (localStorage.getItem('sabiluna_theme') as ThemeTemplate) || 'emerald';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('sabiluna_dark') === 'true';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    return (localStorage.getItem('sabiluna_text_size') as TextSize) || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('sabiluna_theme', template);
  }, [template]);

  useEffect(() => {
    localStorage.setItem('sabiluna_dark', isDark ? 'true' : 'false');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('sabiluna_text_size', textSize);
  }, [textSize]);

  const setTemplate = (t: ThemeTemplate) => setTemplateState(t);
  const toggleDark = () => setIsDark(prev => !prev);
  const setTextSize = (s: TextSize) => setTextSizeState(s);

  // Dynamic theme properties
  const getThemeConfig = () => {
    switch (template) {
      case 'sapphire':
        return {
          name: 'Midnight Sapphire',
          description: 'Biru Navy Elegan & Modern',
          primaryBg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800',
          cardBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100/80 shadow-sm',
          accentColor: '#2563EB',
          textColor: isDark ? 'text-blue-400' : 'text-blue-800',
          badgeStyle: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-md',
          navStyle: isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-blue-100 shadow-sm',
        };
      case 'minimal':
        return {
          name: 'Clean Minimalist',
          description: 'Monokrom Slate Bersih',
          primaryBg: isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
          cardBg: isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm',
          accentColor: '#3F3F46',
          textColor: isDark ? 'text-zinc-200' : 'text-zinc-900',
          badgeStyle: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
          buttonPrimary: 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
          navStyle: isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/95 border-zinc-200 shadow-sm',
        };
      case 'sand':
        return {
          name: 'Warm Terakota',
          description: 'Warna Bumi Hangat & Ramah',
          primaryBg: isDark ? 'bg-stone-950 text-stone-100' : 'bg-amber-50/40 text-stone-800',
          cardBg: isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-amber-200/60 shadow-sm',
          accentColor: '#D97706',
          textColor: isDark ? 'text-amber-400' : 'text-amber-900',
          badgeStyle: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          buttonPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 shadow-md',
          navStyle: isDark ? 'bg-stone-900/90 border-stone-800' : 'bg-white/95 border-amber-200 shadow-sm',
        };
      case 'emerald':
      default:
        return {
          name: 'Emerald Baitullah',
          description: 'Hijau Islami Modern & Emas',
          primaryBg: isDark ? 'bg-slate-950 text-emerald-50' : 'bg-slate-50 text-slate-800',
          cardBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-100 shadow-sm',
          accentColor: '#059669',
          textColor: isDark ? 'text-emerald-400' : 'text-emerald-800',
          badgeStyle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 shadow-md',
          navStyle: isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-emerald-100 shadow-sm',
        };
    }
  };

  const themeConfig = getThemeConfig();

  // Root text size class
  const textSizeClass =
    textSize === 'xlarge'
      ? 'text-lg leading-relaxed'
      : textSize === 'large'
      ? 'text-base leading-normal'
      : 'text-sm leading-normal';

  return (
    <ThemeContext.Provider
      value={{
        template,
        setTemplate,
        isDark,
        toggleDark,
        textSize,
        setTextSize,
        themeConfig,
      }}
    >
      <div className={`min-h-screen ${themeConfig.primaryBg} ${textSizeClass} transition-colors duration-200`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
