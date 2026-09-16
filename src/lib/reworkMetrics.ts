import type { TaskFacts } from './taskFacts';
import { monthBucket } from './dateRange';

export type ReworkClassification = 'external' | 'internal' | 'standard';

export function classifyRework(classificationName: string | null): ReworkClassification {
  if (classificationName === 'Ajuste externo') return 'external';
  if (classificationName === 'Ajuste interno') return 'internal';
  return 'standard';
}

export interface ReworkSummary {
  totalTasks: number;
  externalCount: number;
  internalCount: number;
  standardCount: number;
  externalPct: number;
  internalPct: number;
}

export function reworkSummary(facts: TaskFacts[]): ReworkSummary {
  let externalCount = 0;
  let internalCount = 0;
  let standardCount = 0;
  for (const fact of facts) {
    const classification = classifyRework(fact.requestTypeClassificationName);
    if (classification === 'external') externalCount++;
    else if (classification === 'internal') internalCount++;
    else standardCount++;
  }
  const totalTasks = facts.length;
  return {
    totalTasks,
    externalCount,
    internalCount,
    standardCount,
    externalPct: totalTasks === 0 ? 0 : (externalCount / totalTasks) * 100,
    internalPct: totalTasks === 0 ? 0 : (internalCount / totalTasks) * 100,
  };
}

export interface DepartmentReworkSummary {
  department: string;
  totalTasks: number;
  externalCount: number;
  internalCount: number;
  externalPct: number;
  internalPct: number;
}

export function reworkByDepartment(
  facts: Map<string, TaskFacts>,
  departments: Map<string, Set<string>>,
): DepartmentReworkSummary[] {
  const byDepartment = new Map<string, TaskFacts[]>();
  for (const [taskId, fact] of facts) {
    const depts = departments.get(taskId) ?? new Set<string>(['Não informado']);
    for (const department of depts) {
      const list = byDepartment.get(department) ?? [];
      list.push(fact);
      byDepartment.set(department, list);
    }
  }
  return Array.from(byDepartment.entries())
    .map(([department, deptFacts]) => {
      const { totalTasks, externalCount, internalCount, externalPct, internalPct } = reworkSummary(deptFacts);
      return { department, totalTasks, externalCount, internalCount, externalPct, internalPct };
    })
    .sort((a, b) => b.totalTasks - a.totalTasks);
}

export interface MonthlyReworkTrend {
  month: string;
  externalCount: number;
  internalCount: number;
  standardCount: number;
}

export function reworkTrend(facts: TaskFacts[]): MonthlyReworkTrend[] {
  const byMonth = new Map<string, MonthlyReworkTrend>();
  for (const fact of facts) {
    const month = monthBucket(fact.taskCreationDate);
    if (!month) continue;
    const entry = byMonth.get(month) ?? { month, externalCount: 0, internalCount: 0, standardCount: 0 };
    const classification = classifyRework(fact.requestTypeClassificationName);
    if (classification === 'external') entry.externalCount++;
    else if (classification === 'internal') entry.internalCount++;
    else entry.standardCount++;
    byMonth.set(month, entry);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}
