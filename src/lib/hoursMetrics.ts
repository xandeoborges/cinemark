import type { TaskChangeRow } from './types';

export interface PersonHours {
  userLogin: string;
  totalHours: number;
}

export function hoursByPerson(rows: TaskChangeRow[]): PersonHours[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const userLogin = row.UserLogin ?? 'Não informado';
    const hours = row.SpentHours ?? 0;
    totals.set(userLogin, (totals.get(userLogin) ?? 0) + hours);
  }
  return Array.from(totals.entries())
    .map(([userLogin, totalHours]) => ({ userLogin, totalHours }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

export interface PersonDepartmentHours {
  userLogin: string;
  department: string;
  totalHours: number;
}

export function hoursByPersonAndDepartment(rows: TaskChangeRow[]): PersonDepartmentHours[] {
  const totals = new Map<string, PersonDepartmentHours>();
  for (const row of rows) {
    const userLogin = row.UserLogin ?? 'Não informado';
    const department = row.FunctionGroupName ?? 'Não informado';
    const key = `${userLogin}::${department}`;
    const hours = row.SpentHours ?? 0;
    const existing = totals.get(key);
    if (existing) {
      existing.totalHours += hours;
    } else {
      totals.set(key, { userLogin, department, totalHours: hours });
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours);
}
