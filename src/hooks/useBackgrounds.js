import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useBackgrounds(categoryId) {
  return useQuery({
    queryKey: ['backgrounds', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('background_templates')
        .select('*, category:categories(id, name, emoji, color_hex)')
        .order('created_at', { ascending: false })

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUploadBackground() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, name, categoryId }) => {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('background-templates')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('background_templates')
        .insert([{
          name,
          image_url: uploadData.path,
          category_id: categoryId || null,
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] })
      toast.success('Background uploaded successfully')
    },
    onError: () => {
      toast.error('Failed to upload background')
    },
  })
}

export function useDeleteBackground() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, imagePath }) => {
      if (imagePath) {
        await supabase.storage.from('background-templates').remove([imagePath])
      }
      const { error } = await supabase
        .from('background_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] })
      toast.success('Background deleted')
    },
    onError: () => {
      toast.error('Failed to delete background')
    },
  })
}
