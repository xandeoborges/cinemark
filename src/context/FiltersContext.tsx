import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { startOfDayInSaoPaulo, endOfDayInSaoPaulo, type DateRange } from '@/lib/dateRange';

// Determines "today" as a calendar day in America/Sao_Paulo, independent of
// the browser's own timezone (important for CI or a user abroad).
function todayInSaoPaulo(): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(new Date()).split('-').map(Number);
  return { year, month, day };
}

function startOfCurrentMonth(): Date {
  const { year, month } = todayInSaoPaulo();
  return startOfDayInSaoPaulo(year, month, 1);
}

function endOfToday(): Date {
  const { year, month, day } = todayInSaoPaulo();
  return endOfDayInSaoPaulo(year, month, day);
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
