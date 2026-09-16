import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { taskFactsByTaskId, departmentsByKey } from '@/lib/taskFacts';
import {
  averageExecutionTime,
  executionTimeByDepartment,
  executionTimeByRequestType,
} from '@/lib/executionTime';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function ExecutionTimeTab() {
  const { data, isLoading, error, refetch } = useTaskRows();
  const { filters } = useFilters();

  const rows = data ?? [];
  const inRange = filterByDateRange(rows, filters.dateRange, (row) => row.TaskCreationDate);
  const scoped = filters.department
    ? inRange.filter((row) => (row.FunctionGroupName ?? 'Não informado') === filters.department)
    : inRange;

  const facts = taskFactsByTaskId(scoped);
  const departments = departmentsByKey(scoped, (row) => row.TaskID);
  const overall = averageExecutionTime(Array.from(facts.values()));
  const byDepartment = executionTimeByDepartment(facts, departments);
  const byRequestType = executionTimeByRequestType(facts).slice(0, 10);

  return (
    <DataState isLoading={isLoading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KpiCard label="Tempo médio (h)" value={overall.averageHours.toFixed(1)} />
          <KpiCard label="Tarefas concluídas" value={String(overall.taskCount)} />
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="averageHours" fill="hsl(244 94% 69%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byRequestType} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="requestTypeName" width={160} />
              <Tooltip />
              <Bar dataKey="averageHours" fill="hsl(190 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
