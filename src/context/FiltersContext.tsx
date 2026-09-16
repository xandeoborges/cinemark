import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DateRange } from '@/lib/dateRange';

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export interface FiltersState {
  dateRange: DateRange;
  department: string | null;
}

interface FiltersContextValue {
  filters: FiltersState;
  setDateRange: (range: DateRange) => void;
  setDepartment: (department: string | null) => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfCurrentMonth(),
    end: endOfToday(),
  });
  const [department, setDepartment] = useState<string | null>(null);

  const value = useMemo<FiltersContextValue>(
    () => ({ filters: { dateRange, department }, setDateRange, setDepartment }),
    [dateRange, department],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters must be used within a FiltersProvider');
  return context;
}
