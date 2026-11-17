import React, { createContext, useContext, useEffect, useState } from 'react';

export interface RouteState {
  path: string;
  chapterId?: string;
  navigate: (to: string) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const RouteContext = createContext<RouteState>({
  path: '/',
  navigate: () => {},
  isSettingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
      setPath(to);
    }
  };

  // Parse chapterId if route is /c/:chapterId
  const chapterMatch = path.match(/^\/c\/([^/?#]+)/);
  const chapterId = chapterMatch ? chapterMatch[1] : undefined;

  return (
    <RouteContext.Provider
      value={{
        path,
        chapterId,
        navigate,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export const useRouter = () => useContext(RouteContext);
