import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useFestivals() {
  return useQuery({
    queryKey: ['festivals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('festivals')
        .select('*, category:categories(id, name, emoji, color_hex)')
        .eq('is_active', true)
        .order('festival_date', { ascending: true })
      if (error) {
        console.error('Festivals query failed:', error.message)
        toast.error('Failed to load festivals. Please refresh the page.')
        throw error
      }
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateFestival() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (festival) => {
      const { data, error } = await supabase
        .from('festivals')
        .insert([festival])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivals'] })
      toast.success('Festival created successfully')
    },
    onError: () => {
      toast.error('Failed to create festival')
    },
  })
}

export function useToggleFestival() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { data, error } = await supabase
        .from('festivals')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivals'] })
    },
    onError: () => {
      toast.error('Failed to update festival')
    },
  })
}
