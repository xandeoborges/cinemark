import { describe, test, expect } from 'bun:test';
import { fetchAllPages } from './fetchPaginated';

describe('fetchAllPages', () => {
  test('follows pagination until a partial page is returned', async () => {
    const pages = [
      [{ id: 0 }, { id: 1 }],
      [{ id: 2 }, { id: 3 }],
      [{ id: 4 }],
    ];
    let callCount = 0;
    const result = await fetchAllPages(
      async () => {
        const data = pages[callCount] ?? [];
        callCount++;
        return { data, error: null };
      },
      { pageSize: 2 },
    );
    expect(result).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    expect(callCount).toBe(3);
  });

  test('returns an empty array when the first page is empty', async () => {
    const result = await fetchAllPages(async () => ({ data: [], error: null }), { pageSize: 2 });
    expect(result).toEqual([]);
  });

  test('retries a failed page before succeeding', async () => {
    let attempts = 0;
    const result = await fetchAllPages(
      async () => {
        attempts++;
        if (attempts === 1) return { data: null, error: { message: 'network blip' } };
        return { data: [{ id: 1 }], error: null };
      },
      { pageSize: 10, maxRetriesPerPage: 2 },
    );
    expect(result).toEqual([{ id: 1 }]);
    expect(attempts).toBe(2);
  });

  test('throws after exhausting retries for a page', async () => {
    const fetchPage = async () => ({ data: null, error: { message: 'down' } });
    await expect(
      fetchAllPages(fetchPage, { pageSize: 10, maxRetriesPerPage: 1 }),
    ).rejects.toThrow('Failed to fetch page starting at 0 after 2 attempts: down');
  });
});
