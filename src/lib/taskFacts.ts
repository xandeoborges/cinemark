import type { TaskChangeRow } from './types';

export interface TaskFacts {
  taskId: string;
  taskNumber: string | null;
  taskCreationDate: string | null;
  taskClosingDate: string | null;
  requestTypeClassificationName: string | null;
  requestTypeName: string | null;
}

export function taskFactsByTaskId(rows: TaskChangeRow[]): Map<string, TaskFacts> {
  const facts = new Map<string, TaskFacts>();
  for (const row of rows) {
    if (!row.TaskID || facts.has(row.TaskID)) continue;
    facts.set(row.TaskID, {
      taskId: row.TaskID,
      taskNumber: row.TaskNumber,
      taskCreationDate: row.TaskCreationDate,
      taskClosingDate: row.TaskClosingDate,
      requestTypeClassificationName: row.RequestTypeClassificationName,
      requestTypeName: row.RequestTypeName,
    });
  }
  return facts;
}

export function departmentsByKey(
  rows: TaskChangeRow[],
  keyFn: (row: TaskChangeRow) => string | null,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const department = row.FunctionGroupName ?? 'Não informado';
    const set = map.get(key) ?? new Set<string>();
    set.add(department);
    map.set(key, set);
  }
  return map;
}
