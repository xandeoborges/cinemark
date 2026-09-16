import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchAllPages } from '@/lib/fetchPaginated';
import type { DeliveryRow } from '@/lib/types';

async function fetchDeliveryRows(): Promise<DeliveryRow[]> {
  return fetchAllPages<DeliveryRow>(async (from, to) => {
    const response = await supabase
      .from('requestdelivery')
      .select('*')
      .eq('ClientDisplayName', 'Cinemark')
      .order('RequestDeliveryID', { ascending: true })
      .range(from, to);
    return {
      data: response.data,
      error: response.error,
    };
  });
}

export function useDeliveryRows() {
  return useQuery({
    queryKey: ['cinemark', 'requestdelivery'],
    queryFn: fetchDeliveryRows,
    staleTime: 1000 * 60 * 60 * 4,
  });
}
