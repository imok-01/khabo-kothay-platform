import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'khabo-kothay:recently-viewed';
const MAX_RECENT = 8;

interface RecentlyViewedContextValue {
  recentIds: string[];
  addRecent: (id: string) => void;
  clearRecent: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentIds));
    } catch {
      // storage unavailable — recent history just won't persist
    }
  }, [recentIds]);

  const addRecent = useCallback((id: string) => {
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT));
  }, []);

  const clearRecent = useCallback(() => setRecentIds([]), []);

  const value = useMemo(() => ({ recentIds, addRecent, clearRecent }), [recentIds, addRecent, clearRecent]);

  return (
    <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed(): RecentlyViewedContextValue {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  return ctx;
}
