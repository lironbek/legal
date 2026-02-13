import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseReachable } from '@/lib/supabase';
import type { SigningRequest } from '@/services/signingService';

export function useSigningRequests(companyId: string | undefined) {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes on signing_requests
  useEffect(() => {
    if (!companyId || !supabase) return;

    const channel = supabase
      .channel('signing-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signing_requests',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['signing-requests', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return useQuery({
    queryKey: ['signing-requests', companyId],
    queryFn: async (): Promise<SigningRequest[]> => {
      if (!companyId || !supabase) return [];

      const reachable = await isSupabaseReachable();
      if (!reachable) return [];

      const { data, error } = await supabase
        .from('signing_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SigningRequest[];
    },
    enabled: !!companyId,
    retry: 1,
    refetchInterval: 30000,
  });
}
