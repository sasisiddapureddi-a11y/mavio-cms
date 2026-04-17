import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useLanguages() {
  return useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .eq('is_active', true)
      if (error) {
        console.error('[useLanguages] error:', error.message, error.code)
        toast.error('Failed to load languages — check Supabase RLS policies')
        throw error
      }
      return data ?? []
    },
    staleTime: 10 * 60 * 1000,
  })
}
