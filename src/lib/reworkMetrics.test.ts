import { describe, test, expect } from 'bun:test';
import { classifyRework, reworkSummary, reworkByDepartment, reworkTrend } from './reworkMetrics';
import type { TaskFacts } from './taskFacts';

function fact(overrides: Partial<TaskFacts>): TaskFacts {
  return {
    taskId: 'task-1',
    taskNumber: '100',
    taskCreationDate: '2026-08-01T00:00:00Z',
    taskClosingDate: null,
    requestTypeClassificationName: 'Solicitação padrão',
    requestTypeName: 'Peças',
    ...overrides,
  };
}

describe('classifyRework', () => {
  test('classifies known classification names', () => {
    expect(classifyRework('Ajuste externo')).toBe('external');
    expect(classifyRework('Ajuste interno')).toBe('internal');
    expect(classifyRework('Solicitação padrão')).toBe('standard');
  });

  test('treats unknown or missing classification as standard', () => {
    expect(classifyRework(null)).toBe('standard');
    expect(classifyRework('Algo novo')).toBe('standard');
  });
});

describe('reworkSummary', () => {
  test('computes counts and percentages', () => {
    const facts = [
      fact({ requestTypeClassificationName: 'Ajuste externo' }),
      fact({ requestTypeClassificationName: 'Ajuste interno' }),
      fact({ requestTypeClassificationName: 'Solicitação padrão' }),
      fact({ requestTypeClassificationName: 'Solicitação padrão' }),
    ];
    expect(reworkSummary(facts)).toEqual({
      totalTasks: 4,
      externalCount: 1,
      internalCount: 1,
      standardCount: 2,
      externalPct: 25,
      internalPct: 25,
    });
  });

  test('returns zero percentages for an empty list', () => {
    expect(reworkSummary([])).toEqual({
      totalTasks: 0,
      externalCount: 0,
      internalCount: 0,
      standardCount: 0,
      externalPct: 0,
      internalPct: 0,
    });
  });
});

describe('reworkByDepartment', () => {
  test('counts a task in every department it touched', () => {
    const facts = new Map([
      ['task-1', fact({ taskId: 'task-1', requestTypeClassificationName: 'Ajuste externo' })],
    ]);
    const departments = new Map([['task-1', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = reworkByDepartment(facts, departments);
    const atendimento = result.find((r) => r.department === 'Atendimento');
    const conteudo = result.find((r) => r.department === 'Conteúdo');
    expect(atendimento?.externalCount).toBe(1);
    expect(atendimento?.totalTasks).toBe(1);
    expect(conteudo?.externalCount).toBe(1);
  });
});

describe('reworkTrend', () => {
  test('buckets tasks by creation month', () => {
    const facts = [
      fact({ taskCreationDate: '2026-08-05T00:00:00Z', requestTypeClassificationName: 'Ajuste externo' }),
      fact({ taskCreationDate: '2026-08-20T00:00:00Z', requestTypeClassificationName: 'Ajuste interno' }),
      fact({ taskCreationDate: '2026-09-01T00:00:00Z', requestTypeClassificationName: 'Solicitação padrão' }),
    ];
    expect(reworkTrend(facts)).toEqual([
      { month: '2026-08', externalCount: 1, internalCount: 1, standardCount: 0 },
      { month: '2026-09', externalCount: 0, internalCount: 0, standardCount: 1 },
    ]);
  });
});
