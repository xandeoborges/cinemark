import { describe, test, expect } from 'bun:test';
import {
  executionTimeInHours,
  averageExecutionTime,
  executionTimeByDepartment,
  executionTimeByRequestType,
} from './executionTime';
import type { TaskFacts } from './taskFacts';

function fact(overrides: Partial<TaskFacts>): TaskFacts {
  return {
    taskId: 'task-1',
    taskNumber: '100',
    taskCreationDate: '2026-08-01T00:00:00Z',
    taskClosingDate: '2026-08-02T00:00:00Z',
    requestTypeClassificationName: 'Solicitação padrão',
    requestTypeName: 'Peças',
    ...overrides,
  };
}

describe('executionTimeInHours', () => {
  test('computes hours between creation and closing', () => {
    expect(executionTimeInHours(fact({}))).toBe(24);
  });

  test('returns null when not closed', () => {
    expect(executionTimeInHours(fact({ taskClosingDate: null }))).toBeNull();
  });

  test('returns null when closing precedes creation', () => {
    expect(
      executionTimeInHours(
        fact({ taskCreationDate: '2026-08-02T00:00:00Z', taskClosingDate: '2026-08-01T00:00:00Z' }),
      ),
    ).toBeNull();
  });
});

describe('averageExecutionTime', () => {
  test('averages only closed tasks', () => {
    const facts = [fact({ taskId: 'a' }), fact({ taskId: 'b', taskClosingDate: null })];
    expect(averageExecutionTime(facts)).toEqual({ averageHours: 24, taskCount: 1 });
  });

  test('returns zero stats when nothing is closed', () => {
    expect(averageExecutionTime([fact({ taskClosingDate: null })])).toEqual({
      averageHours: 0,
      taskCount: 0,
    });
  });
});

describe('executionTimeByDepartment', () => {
  test('counts a task in every department it touched', () => {
    const facts = new Map([['task-1', fact({ taskId: 'task-1' })]]);
    const departments = new Map([['task-1', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = executionTimeByDepartment(facts, departments);
    expect(result).toContainEqual({ department: 'Atendimento', averageHours: 24, taskCount: 1 });
    expect(result).toContainEqual({ department: 'Conteúdo', averageHours: 24, taskCount: 1 });
  });
});

describe('executionTimeByRequestType', () => {
  test('averages by requestTypeName', () => {
    const facts = new Map([
      ['a', fact({ taskId: 'a', requestTypeName: 'Peças' })],
      [
        'b',
        fact({ taskId: 'b', requestTypeName: 'Peças', taskClosingDate: '2026-08-03T00:00:00Z' }),
      ],
    ]);
    expect(executionTimeByRequestType(facts)).toEqual([
      { requestTypeName: 'Peças', averageHours: 36, taskCount: 2 },
    ]);
  });
});
