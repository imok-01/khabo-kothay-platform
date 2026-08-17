import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const MAX_COMPARE = 3;

interface CompareContextValue {
  compareIds: string[];
  isComparing: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const isComparing = useCallback((id: string) => compareIds.includes(id), [compareIds]);
  const clearCompare = useCallback(() => setCompareIds([]), []);

  const value = useMemo(
    () => ({ compareIds, isComparing, toggleCompare, clearCompare }),
    [compareIds, isComparing, toggleCompare, clearCompare],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within a CompareProvider');
  return ctx;
}
