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
  test('keeps one entry per TaskID, using the row with the latest DateCalendar', () => {
    const rows = [
      taskRow({
        TaskID: 'task-1',
        RowID: 1,
        UserLogin: 'A',
        DateCalendar: '2026-08-01T00:00:00+00:00',
        RequestTypeName: 'Primeira linha (mais antiga)',
      }),
      taskRow({
        TaskID: 'task-1',
        RowID: 2,
        UserLogin: 'B',
        DateCalendar: '2026-08-19T00:00:00+00:00',
        RequestTypeName: 'Segunda linha (mais recente)',
      }),
      taskRow({ TaskID: 'task-2', RowID: 3 }),
    ];
    const facts = taskFactsByTaskId(rows);
    expect(facts.size).toBe(2);
    expect(facts.get('task-1')?.taskId).toBe('task-1');
    // The later DateCalendar (RowID 2) should win, not the first row seen.
    expect(facts.get('task-1')?.requestTypeName).toBe('Segunda linha (mais recente)');
  });

  test('skips rows without a TaskID', () => {
    const rows = [taskRow({ TaskID: null, RowID: 1 })];
    expect(taskFactsByTaskId(rows).size).toBe(0);
  });

  test('picks the row with the later DateCalendar, not the first-seen row', () => {
    const rows = [
      taskRow({
        TaskID: 'task-1',
        RowID: 1,
        DateCalendar: '2026-08-19T00:00:00+00:00',
        RequestTypeName: 'Peças',
      }),
      taskRow({
        TaskID: 'task-1',
        RowID: 2,
        DateCalendar: '2026-08-01T00:00:00+00:00',
        RequestTypeName: 'Vídeo',
      }),
    ];
    const facts = taskFactsByTaskId(rows);
    // RowID 1 has the later DateCalendar even though it appears first.
    expect(facts.get('task-1')?.requestTypeName).toBe('Peças');
  });

  test('treats a null DateCalendar as always losing to a parseable date', () => {
    const rows = [
      taskRow({ TaskID: 'task-1', RowID: 1, DateCalendar: null, RequestTypeName: 'Sem data' }),
      taskRow({
        TaskID: 'task-1',
        RowID: 2,
        DateCalendar: '2026-08-01T00:00:00+00:00',
        RequestTypeName: 'Com data',
      }),
    ];
    const facts = taskFactsByTaskId(rows);
    expect(facts.get('task-1')?.requestTypeName).toBe('Com data');
  });

  test('breaks ties on identical DateCalendar by picking the higher RowID', () => {
    const rows = [
      taskRow({
        TaskID: 'task-1',
        RowID: 1,
        DateCalendar: '2026-08-19T00:00:00+00:00',
        RequestTypeName: 'RowID mais baixo',
      }),
      taskRow({
        TaskID: 'task-1',
        RowID: 5,
        DateCalendar: '2026-08-19T00:00:00+00:00',
        RequestTypeName: 'RowID mais alto',
      }),
    ];
    const facts = taskFactsByTaskId(rows);
    expect(facts.get('task-1')?.requestTypeName).toBe('RowID mais alto');
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
