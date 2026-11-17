import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem('omnix_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let resolvedDark = false;
      if (theme === 'dark') {
        resolvedDark = true;
      } else if (theme === 'light') {
        resolvedDark = false;
      } else {
        resolvedDark = mediaQuery.matches;
      }

      setIsDark(resolvedDark);
      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice);
    localStorage.setItem('omnix_theme', choice);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
