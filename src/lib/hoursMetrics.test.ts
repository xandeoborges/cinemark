import { describe, test, expect } from 'bun:test';
import { hoursByPerson, hoursByPersonAndDepartment } from './hoursMetrics';
import type { TaskChangeRow } from './types';

function entry(overrides: Partial<TaskChangeRow>): TaskChangeRow {
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

describe('hoursByPerson', () => {
  test('sums SpentHours per UserLogin across multiple rows', () => {
    const rows = [
      entry({ UserLogin: 'Ana', SpentHours: 2 }),
      entry({ UserLogin: 'Ana', SpentHours: 3 }),
      entry({ UserLogin: 'Bruno', SpentHours: 1 }),
    ];
    expect(hoursByPerson(rows)).toEqual([
      { userLogin: 'Ana', totalHours: 5 },
      { userLogin: 'Bruno', totalHours: 1 },
    ]);
  });

  test('groups missing UserLogin under Não informado', () => {
    const rows = [entry({ UserLogin: null, SpentHours: 2 })];
    expect(hoursByPerson(rows)).toEqual([{ userLogin: 'Não informado', totalHours: 2 }]);
  });

  test('treats missing SpentHours as zero', () => {
    const rows = [entry({ UserLogin: 'Ana', SpentHours: null })];
    expect(hoursByPerson(rows)).toEqual([{ userLogin: 'Ana', totalHours: 0 }]);
  });
});

describe('hoursByPersonAndDepartment', () => {
  test('sums hours per person within each department', () => {
    const rows = [
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Criação', SpentHours: 2 }),
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Mídia', SpentHours: 1 }),
      entry({ UserLogin: 'Ana', FunctionGroupName: 'Criação', SpentHours: 3 }),
    ];
    const result = hoursByPersonAndDepartment(rows);
    expect(result).toContainEqual({ userLogin: 'Ana', department: 'Criação', totalHours: 5 });
    expect(result).toContainEqual({ userLogin: 'Ana', department: 'Mídia', totalHours: 1 });
  });
});
