import { useFilters } from '@/context/FiltersContext';
import { startOfDayInSaoPaulo, endOfDayInSaoPaulo } from '@/lib/dateRange';

const DEPARTMENTS = [
  'Atendimento',
  'Conteúdo',
  'Criação',
  'Eventos',
  'Finalização',
  'Mídia',
  'Planejamento',
  'Produção Grafica',
  'RTVC',
  'WDI',
  'WDI/BI',
];

// Renders a Date (a Sao Paulo instant) back into the <input type="date">
// value as the calendar day it represents IN Sao Paulo, independent of the
// browser's own timezone.
function toInputValue(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

interface ParsedYMD {
  year: number;
  month: number;
  day: number;
}

// Parses the Y-M-D typed into a date input. Does not construct a Date itself
// (that would tie the result to the browser's local timezone) — callers pick
// start-of-day or end-of-day in Sao Paulo via dateRange.ts's helpers.
function parseInputValue(value: string): ParsedYMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function FilterBar() {
  const { filters, setDateRange, setDepartment } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        De
        <input
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={toInputValue(filters.dateRange.start)}
          onChange={(event) => {
            const parsed = parseInputValue(event.target.value);
            if (!parsed) return;
            const start = startOfDayInSaoPaulo(parsed.year, parsed.month, parsed.day);
            setDateRange({ ...filters.dateRange, start });
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Até
        <input
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={toInputValue(filters.dateRange.end)}
          onChange={(event) => {
            const parsed = parseInputValue(event.target.value);
            if (!parsed) return;
            const end = endOfDayInSaoPaulo(parsed.year, parsed.month, parsed.day);
            setDateRange({ ...filters.dateRange, end });
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Departamento
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={filters.department ?? ''}
          onChange={(event) => setDepartment(event.target.value || null)}
        >
          <option value="">Todos</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
