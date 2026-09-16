import { useFilters } from '@/context/FiltersContext';

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

function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
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
            const start = parseInputValue(event.target.value);
            if (!start) return;
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
            const end = parseInputValue(event.target.value);
            if (!end) return;
            end.setHours(23, 59, 59, 999);
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
