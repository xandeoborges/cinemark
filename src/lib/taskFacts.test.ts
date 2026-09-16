import { describe, test, expect } from 'bun:test';
import { taskFactsByTaskId, departmentsByKey } from './taskFacts';
import type { TaskChangeRow } from './types';

function taskRow(overrides: Partial<TaskChangeRow>): TaskChangeRow {
  return {
    ClientDisplayName: 'Cinemark',
    ClientID: '82063',
    DateCalendar: '2026-08-19T03:00:00+00:00',
    FunctionGroupID: null,
    FunctionGroupName: 'Criação',
    GroupID: null,
    GroupName: null,
    JobID: null,
    JobNumber: null,
    Jobtitle: null,
    Month: 8,
    ParentTaskID: null,
    ParentTaskNumber: null,
    ParentTaskTitle: null,
    PipelineStepID: null,
    PipelineStepName: null,
    ProductID: null,
    ProductName: null,
    RequestFirstDueDate: null,
    RequestTypeClassificationID: null,
    RequestTypeClassificationName: 'Solicitação padrão',
    RequestTypeID: null,
    RequestTypeName: 'Peças',
    SpentHours: 1,
    TaskClosingDate: null,
    TaskCreationDate: '2026-08-01T00:00:00Z',
    TaskID: 'task-1',
    TaskNumber: '100',
    TaskTags: '',
    TaskTitle: 'Tarefa',
    UserFunctionID: null,
    UserFunctionTitle: null,
    UserID: null,
    UserLogin: 'Fulano',
    RowID: 1,
    ...overrides,
  };
}

describe('taskFactsByTaskId', () => {
  test('keeps one entry per TaskID', () => {
    const rows = [
      taskRow({ TaskID: 'task-1', RowID: 1, UserLogin: 'A' }),
      taskRow({ TaskID: 'task-1', RowID: 2, UserLogin: 'B' }),
      taskRow({ TaskID: 'task-2', RowID: 3 }),
    ];
    const facts = taskFactsByTaskId(rows);
    expect(facts.size).toBe(2);
    expect(facts.get('task-1')?.taskId).toBe('task-1');
  });

  test('skips rows without a TaskID', () => {
    const rows = [taskRow({ TaskID: null, RowID: 1 })];
    expect(taskFactsByTaskId(rows).size).toBe(0);
  });
});

describe('departmentsByKey', () => {
  test('collects every distinct department a task touched', () => {
    const rows = [
      taskRow({ TaskID: 'task-1', FunctionGroupName: 'Atendimento' }),
      taskRow({ TaskID: 'task-1', FunctionGroupName: 'Conteúdo' }),
      taskRow({ TaskID: 'task-2', FunctionGroupName: 'Criação' }),
    ];
    const result = departmentsByKey(rows, (row) => row.TaskID);
    expect(result.get('task-1')).toEqual(new Set(['Atendimento', 'Conteúdo']));
    expect(result.get('task-2')).toEqual(new Set(['Criação']));
  });

  test('skips rows where the key function returns null', () => {
    const rows = [taskRow({ TaskNumber: null })];
    const result = departmentsByKey(rows, (row) => row.TaskNumber);
    expect(result.size).toBe(0);
  });
});
