import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { taskFactsByTaskId, departmentsByKey } from '@/lib/taskFacts';
import { reworkSummary, reworkByDepartment, reworkTrend } from '@/lib/reworkMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function ReworkTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.TaskCreationDate);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const facts = taskFactsByTaskId(scoped);
  const departments = departmentsByKey(scoped, (row) => row.TaskID);
  const factsList = Array.from(facts.values());
  const summary = reworkSummary(factsList);
  const byDepartment = reworkByDepartment(facts, departments);
  const trend = reworkTrend(factsList);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total de tarefas" value={String(summary.totalTasks)} />
          <KpiCard label="% Ajuste cliente" value={`${summary.externalPct.toFixed(1)}%`} />
          <KpiCard label="% Ajuste interno" value={`${summary.internalPct.toFixed(1)}%`} />
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="externalCount" name="Ajuste cliente" stroke="hsl(348 100% 65%)" />
              <Line type="monotone" dataKey="internalCount" name="Ajuste interno" stroke="hsl(42 100% 50%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="externalCount" name="Ajuste cliente" stackId="a" fill="hsl(348 100% 65%)" />
              <Bar dataKey="internalCount" name="Ajuste interno" stackId="a" fill="hsl(42 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
