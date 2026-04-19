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
      if (!file) throw new Error('Image file is required')
      if (!name?.trim()) throw new Error('Background name is required')

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Background image must be smaller than 10MB')
      }

      const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('background-templates')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
      if (!uploadData?.path) throw new Error('Upload succeeded but no path returned')

      const { data, error } = await supabase
        .from('background_templates')
        .insert([{
          name: name.trim(),
          image_url: uploadData.path,
          category_id: categoryId && categoryId !== 'all' ? categoryId : null,
        }])
        .select()
        .single()

      if (error) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('background-templates').remove([uploadData.path]).catch(() => {})
        throw new Error(`Failed to save background: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] })
      toast.success('Background uploaded successfully')
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to upload background')
    },
  })
}

export function useDeleteBackground() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, imagePath }) => {
      if (imagePath && !imagePath.startsWith('http')) {
        await supabase.storage.from('background-templates').remove([imagePath]).catch((err) => {
          console.warn('[useDeleteBackground] Storage deletion failed:', err.message)
        })
      }

      const { error } = await supabase
        .from('background_templates')
        .delete()
        .eq('id', id)

      if (error) throw new Error(`Failed to delete background: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backgrounds'] })
      toast.success('Background deleted')
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete background')
    },
  })
}
