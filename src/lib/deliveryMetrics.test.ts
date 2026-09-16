import { describe, test, expect } from 'bun:test';
import {
  deliveriesByType,
  deliveriesByEffortGroup,
  deliveriesOverTime,
  deliveriesByDepartment,
} from './deliveryMetrics';
import type { DeliveryRow } from './types';

function delivery(overrides: Partial<DeliveryRow>): DeliveryRow {
  return {
    ClientDisplayName: 'Cinemark',
    CreationDate: '2026-08-05T00:00:00Z',
    EffortUnitGroupName: 'RTVC',
    EffortUnitGroupTypeName: 'Tipo padrão',
    JobTitle: 'Job',
    Quantity: 1,
    RequestTypeName: 'GERAL',
    TaskNumber: 100,
    TaskTitle: 'Tarefa',
    UnitName: 'Post estático',
    RequestDeliveryID: 1,
    ...overrides,
  };
}

describe('deliveriesByType', () => {
  test('sums quantity per RequestTypeName', () => {
    const rows = [
      delivery({ RequestTypeName: 'GERAL', Quantity: 2 }),
      delivery({ RequestTypeName: 'GERAL', Quantity: 3 }),
      delivery({ RequestTypeName: 'MOTION', Quantity: 1 }),
    ];
    expect(deliveriesByType(rows)).toEqual([
      { requestTypeName: 'GERAL', totalQuantity: 5 },
      { requestTypeName: 'MOTION', totalQuantity: 1 },
    ]);
  });
});

describe('deliveriesByEffortGroup', () => {
  test('sums quantity per EffortUnitGroupName', () => {
    const rows = [
      delivery({ EffortUnitGroupName: 'RTVC', Quantity: 2 }),
      delivery({ EffortUnitGroupName: 'Campanha', Quantity: 4 }),
    ];
    expect(deliveriesByEffortGroup(rows)).toEqual([
      { effortUnitGroupName: 'Campanha', totalQuantity: 4 },
      { effortUnitGroupName: 'RTVC', totalQuantity: 2 },
    ]);
  });
});

describe('deliveriesOverTime', () => {
  test('buckets quantity by creation month', () => {
    const rows = [
      delivery({ CreationDate: '2026-08-05T00:00:00Z', Quantity: 2 }),
      delivery({ CreationDate: '2026-08-20T00:00:00Z', Quantity: 3 }),
      delivery({ CreationDate: '2026-09-15T12:00:00Z', Quantity: 1 }),
    ];
    expect(deliveriesOverTime(rows)).toEqual([
      { month: '2026-08', totalQuantity: 5 },
      { month: '2026-09', totalQuantity: 1 },
    ]);
  });

  test('applies the America/Sao_Paulo offset at a month boundary, not UTC', () => {
    // 2026-09-01T01:00:00Z is 2026-08-31T22:00 in America/Sao_Paulo (UTC-3):
    // still August locally, even though the UTC calendar date is already September.
    // A UTC-hardcoded implementation would wrongly bucket this row into September.
    const rows = [
      delivery({ CreationDate: '2026-08-05T00:00:00Z', Quantity: 2 }),
      delivery({ CreationDate: '2026-09-01T01:00:00Z', Quantity: 1 }),
    ];
    expect(deliveriesOverTime(rows)).toEqual([{ month: '2026-08', totalQuantity: 3 }]);
  });
});

describe('deliveriesByDepartment', () => {
  test('attributes a delivery to every department its task touched', () => {
    const rows = [delivery({ TaskNumber: 100, Quantity: 2 })];
    const departmentsByTaskNumber = new Map([['100', new Set(['Atendimento', 'Conteúdo'])]]);
    const result = deliveriesByDepartment(rows, departmentsByTaskNumber);
    expect(result).toContainEqual({ department: 'Atendimento', totalQuantity: 2 });
    expect(result).toContainEqual({ department: 'Conteúdo', totalQuantity: 2 });
  });

  test('falls back to Não informado when the task is not found', () => {
    const rows = [delivery({ TaskNumber: 999, Quantity: 1 })];
    const result = deliveriesByDepartment(rows, new Map());
    expect(result).toEqual([{ department: 'Não informado', totalQuantity: 1 }]);
  });
});
