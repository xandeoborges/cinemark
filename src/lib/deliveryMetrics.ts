import type { DeliveryRow } from './types';
import { monthBucket } from './dateRange';

export interface DeliveryTypeTotal {
  requestTypeName: string;
  totalQuantity: number;
}

export function deliveriesByType(rows: DeliveryRow[]): DeliveryTypeTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const requestTypeName = row.RequestTypeName ?? 'Não informado';
    const quantity = row.Quantity ?? 0;
    totals.set(requestTypeName, (totals.get(requestTypeName) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([requestTypeName, totalQuantity]) => ({ requestTypeName, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export interface EffortGroupTotal {
  effortUnitGroupName: string;
  totalQuantity: number;
}

export function deliveriesByEffortGroup(rows: DeliveryRow[]): EffortGroupTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const group = row.EffortUnitGroupName ?? 'Não informado';
    const quantity = row.Quantity ?? 0;
    totals.set(group, (totals.get(group) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([effortUnitGroupName, totalQuantity]) => ({ effortUnitGroupName, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export interface MonthlyDeliveryTotal {
  month: string;
  totalQuantity: number;
}

export function deliveriesOverTime(rows: DeliveryRow[]): MonthlyDeliveryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const month = monthBucket(row.CreationDate);
    if (!month) continue;
    const quantity = row.Quantity ?? 0;
    totals.set(month, (totals.get(month) ?? 0) + quantity);
  }
  return Array.from(totals.entries())
    .map(([month, totalQuantity]) => ({ month, totalQuantity }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface DepartmentDeliveryTotal {
  department: string;
  totalQuantity: number;
}

export function deliveriesByDepartment(
  rows: DeliveryRow[],
  departmentsByTaskNumber: Map<string, Set<string>>,
): DepartmentDeliveryTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.TaskNumber === null) continue;
    const departments =
      departmentsByTaskNumber.get(String(row.TaskNumber)) ?? new Set<string>(['Não informado']);
    const quantity = row.Quantity ?? 0;
    for (const department of departments) {
      totals.set(department, (totals.get(department) ?? 0) + quantity);
    }
  }
  return Array.from(totals.entries())
    .map(([department, totalQuantity]) => ({ department, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}
