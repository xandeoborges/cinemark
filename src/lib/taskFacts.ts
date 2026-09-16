import type { TaskChangeRow } from './types';

export interface TaskFacts {
  taskId: string;
  taskNumber: string | null;
  taskCreationDate: string | null;
  taskClosingDate: string | null;
  requestTypeClassificationName: string | null;
  requestTypeName: string | null;
}

function dateCalendarTime(row: TaskChangeRow): number {
  if (!row.DateCalendar) return -Infinity;
  const time = new Date(row.DateCalendar).getTime();
  return Number.isNaN(time) ? -Infinity : time;
}

export function taskFactsByTaskId(rows: TaskChangeRow[]): Map<string, TaskFacts> {
  const latestRowByTaskId = new Map<string, TaskChangeRow>();
  for (const row of rows) {
    if (!row.TaskID) continue;
    const existing = latestRowByTaskId.get(row.TaskID);
    if (!existing) {
      latestRowByTaskId.set(row.TaskID, row);
      continue;
    }
    const existingTime = dateCalendarTime(existing);
    const rowTime = dateCalendarTime(row);
    const rowWins =
      rowTime > existingTime || (rowTime === existingTime && row.RowID > existing.RowID);
    if (rowWins) {
      latestRowByTaskId.set(row.TaskID, row);
    }
  }

  const facts = new Map<string, TaskFacts>();
  for (const [taskId, row] of latestRowByTaskId) {
    facts.set(taskId, {
      taskId,
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
