import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) {
        console.error('[useCategories] error:', error.message, error.code)
        toast.error('Failed to load categories — check Supabase RLS policies')
        throw error
      }
      return data ?? []
    },
    staleTime: 10 * 60 * 1000,
  })
}
