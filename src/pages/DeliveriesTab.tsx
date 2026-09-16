import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTaskRows } from '@/hooks/useTaskRows';
import { useDeliveryRows } from '@/hooks/useDeliveryRows';
import { useFilters } from '@/context/FiltersContext';
import { filterByDateRange } from '@/lib/dateRange';
import { departmentsByKey } from '@/lib/taskFacts';
import {
  deliveriesByType,
  deliveriesByEffortGroup,
  deliveriesOverTime,
  deliveriesByDepartment,
} from '@/lib/deliveryMetrics';
import { KpiCard } from '@/components/KpiCard';
import { DataState } from '@/components/DataState';

export function DeliveriesTab() {
  const taskRowsQuery = useTaskRows();
  const deliveryRowsQuery = useDeliveryRows();
  const { filters } = useFilters();

  const isLoading = taskRowsQuery.isLoading || deliveryRowsQuery.isLoading;
  const error = taskRowsQuery.error ?? deliveryRowsQuery.error;

  const taskRows = taskRowsQuery.data ?? [];
  const deliveryRows = deliveryRowsQuery.data ?? [];

  const inRange = filterByDateRange(deliveryRows, filters.dateRange, (row) => row.CreationDate);
  const departmentMap = departmentsByKey(taskRows, (row) => row.TaskNumber);
  const scoped = filters.department
    ? inRange.filter((row) => {
        if (row.TaskNumber === null) return false;
        const departments = departmentMap.get(String(row.TaskNumber));
        return departments?.has(filters.department as string) ?? false;
      })
    : inRange;

  const byType = deliveriesByType(scoped);
  const byEffortGroup = deliveriesByEffortGroup(scoped);
  const overTime = deliveriesOverTime(scoped);
  const byDepartment = deliveriesByDepartment(scoped, departmentMap);
  const totalQuantity = byType.reduce((sum, item) => sum + item.totalQuantity, 0);

  return (
    <DataState
      isLoading={isLoading}
      error={error}
      onRetry={() => {
        taskRowsQuery.refetch();
        deliveryRowsQuery.refetch();
      }}
    >
      <div className="flex flex-col gap-6">
        <KpiCard label="Total de entregas" value={totalQuantity.toFixed(0)} />
        <div className="glass-card p-4" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalQuantity" stroke="hsl(244 94% 69%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="requestTypeName" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="hsl(190 100% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalQuantity" fill="hsl(160 100% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byEffortGroup}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="effortUnitGroupName" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalQuantity" fill="hsl(42 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataState>
  );
}
