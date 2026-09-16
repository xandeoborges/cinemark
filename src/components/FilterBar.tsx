import { useFilters } from '@/context/FiltersContext';

const DEPARTMENTS = [
  'Atendimento',
  'Conteúdo',
  'Criação',
  'Finalização',
  'Mídia',
  'Planejamento',
  'Produção Gráfica',
  'RTVC',
];

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
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
            const start = new Date(event.target.value);
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
            const end = new Date(event.target.value);
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
