import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { hoursByPerson, hoursByPersonAndDepartment } from '@/lib/hoursMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function HoursTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.DateCalendar);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const byPerson = hoursByPerson(scoped);
  const byPersonAndDepartment = hoursByPersonAndDepartment(scoped);
  const totalHours = byPerson.reduce((sum, person) => sum + person.totalHours, 0);
  const top15 = byPerson.slice(0, 15);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Total de horas" value={totalHours.toFixed(1)} />
          <KpiCard label="Pessoas ativas" value={String(byPerson.length)} />
        </div>
        <div className="glass-card p-4" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top15} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="userLogin" width={160} />
              <Tooltip />
              <Bar dataKey="totalHours" fill="hsl(244 94% 69%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-2 pr-4">Pessoa</th>
                <th className="py-2 pr-4">Departamento</th>
                <th className="py-2 pr-4">Horas</th>
              </tr>
            </thead>
            <tbody>
              {byPersonAndDepartment.map((row) => (
                <tr key={`${row.userLogin}-${row.department}`} className="border-t border-border">
                  <td className="py-2 pr-4 text-foreground">{row.userLogin}</td>
                  <td className="py-2 pr-4 text-foreground">{row.department}</td>
                  <td className="py-2 pr-4 text-foreground">{row.totalHours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DataState>
  );
}
