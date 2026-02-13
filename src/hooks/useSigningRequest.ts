import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseReachable } from '@/lib/supabase';
import type { SigningRequest } from '@/services/signingService';

export function useSigningRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['signing-request', id],
    queryFn: async (): Promise<SigningRequest | null> => {
      if (!id || !supabase) return null;

      const reachable = await isSupabaseReachable();
      if (!reachable) return null;

      const { data, error } = await supabase
        .from('signing_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as SigningRequest;
    },
    enabled: !!id,
    retry: 1,
  });
}
