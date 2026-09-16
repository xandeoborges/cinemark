export interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export type PageFetcher<T> = (from: number, to: number) => Promise<PageResult<T>>;

export interface FetchAllPagesOptions {
  pageSize?: number;
  maxRetriesPerPage?: number;
}

export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  options: FetchAllPagesOptions = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? 1000;
  const maxRetriesPerPage = options.maxRetriesPerPage ?? 2;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    let page: T[] | null = null;
    let lastErrorMessage: string | null = null;

    for (let attempt = 0; attempt <= maxRetriesPerPage; attempt++) {
      const { data, error } = await fetchPage(from, to);
      if (!error) {
        page = data ?? [];
        break;
      }
      lastErrorMessage = error.message;
    }

    if (page === null) {
      throw new Error(
        `Failed to fetch page starting at ${from} after ${maxRetriesPerPage + 1} attempts: ${lastErrorMessage}`,
      );
    }

    results.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return results;
}
