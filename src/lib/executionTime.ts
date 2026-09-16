import type { TaskFacts } from './taskFacts';

export function executionTimeInHours(
  fact: Pick<TaskFacts, 'taskCreationDate' | 'taskClosingDate'>,
): number | null {
  if (!fact.taskCreationDate || !fact.taskClosingDate) return null;
  const created = new Date(fact.taskCreationDate).getTime();
  const closed = new Date(fact.taskClosingDate).getTime();
  if (Number.isNaN(created) || Number.isNaN(closed) || closed < created) return null;
  return (closed - created) / (1000 * 60 * 60);
}

export interface ExecutionTimeStats {
  averageHours: number;
  taskCount: number;
}

export function averageExecutionTime(facts: TaskFacts[]): ExecutionTimeStats {
  const durations = facts
    .map(executionTimeInHours)
    .filter((hours): hours is number => hours !== null);
  if (durations.length === 0) return { averageHours: 0, taskCount: 0 };
  const total = durations.reduce((sum, hours) => sum + hours, 0);
  return { averageHours: total / durations.length, taskCount: durations.length };
}

export interface DepartmentExecutionTime {
  department: string;
  averageHours: number;
  taskCount: number;
}

export function executionTimeByDepartment(
  facts: Map<string, TaskFacts>,
  departments: Map<string, Set<string>>,
): DepartmentExecutionTime[] {
  const durationsByDepartment = new Map<string, number[]>();
  for (const [taskId, fact] of facts) {
    const duration = executionTimeInHours(fact);
    if (duration === null) continue;
    const depts = departments.get(taskId) ?? new Set<string>(['Não informado']);
    for (const department of depts) {
      const list = durationsByDepartment.get(department) ?? [];
      list.push(duration);
      durationsByDepartment.set(department, list);
    }
  }
  return Array.from(durationsByDepartment.entries())
    .map(([department, durations]) => ({
      department,
      averageHours: durations.reduce((sum, h) => sum + h, 0) / durations.length,
      taskCount: durations.length,
    }))
    .sort((a, b) => b.averageHours - a.averageHours);
}

export interface RequestTypeExecutionTime {
  requestTypeName: string;
  averageHours: number;
  taskCount: number;
}

export function executionTimeByRequestType(
  facts: Map<string, TaskFacts>,
): RequestTypeExecutionTime[] {
  const durationsByType = new Map<string, number[]>();
  for (const fact of facts.values()) {
    const duration = executionTimeInHours(fact);
    if (duration === null) continue;
    const requestTypeName = fact.requestTypeName ?? 'Não informado';
    const list = durationsByType.get(requestTypeName) ?? [];
    list.push(duration);
    durationsByType.set(requestTypeName, list);
  }
  return Array.from(durationsByType.entries())
    .map(([requestTypeName, durations]) => ({
      requestTypeName,
      averageHours: durations.reduce((sum, h) => sum + h, 0) / durations.length,
      taskCount: durations.length,
    }))
    .sort((a, b) => b.averageHours - a.averageHours);
}
