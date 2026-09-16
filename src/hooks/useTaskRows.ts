import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchPaginated';
import type { TaskChangeRow } from '@/lib/types';

async function fetchTaskRows(): Promise<TaskChangeRow[]> {
  return fetchAllPages<TaskChangeRow>(async (from, to) => {
    const response = await supabase
      .from('requesttypechange')
      .select('*')
      .eq('ClientDisplayName', 'Cinemark')
      .order('RowID', { ascending: true })
      .range(from, to);
    return {
      data: response.data,
      error: response.error,
    };
  });
}

export function useTaskRows() {
  return useQuery({
    queryKey: ['cinemark', 'requesttypechange'],
    queryFn: fetchTaskRows,
    staleTime: 1000 * 60 * 60 * 4,
  });
}
