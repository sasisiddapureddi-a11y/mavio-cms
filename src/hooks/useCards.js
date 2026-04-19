import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Use * only — explicit column listing after * causes PostgREST 400 if columns don't exist yet
const CARD_SELECT = `
  *,
  category:categories(id, name, emoji, color_hex),
  language:languages(id, name, code),
  festival:festivals(id, name, festival_date)
`

export function useCards(filters = {}) {
  return useQuery({
    queryKey: ['cards', filters],
    queryFn: async () => {
      let query = supabase
        .from('content_cards')
        .select(CARD_SELECT)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.language_id) {
        query = query.eq('language_id', filters.language_id)
      }
      if (filters.search) {
        query = query.ilike('content_text', `%${filters.search}%`)
      }

      // Use range for pagination; fall back to limit for non-paginated queries
      if (typeof filters.offset === 'number') {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
      } else if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCard(id) {
  return useQuery({
    queryKey: ['card', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_cards')
        .select(CARD_SELECT)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, ...cardData }) => {
      if (!file) throw new Error('Image file is required')

      const MAX_FILE_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image must be smaller than 5MB')
      }

      // Check bucket exists
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
        if (bucketsError) {
          console.error('[useCreateCard] Failed to list buckets:', bucketsError.message)
          throw new Error('Failed to access storage buckets')
        }

        const bucketExists = buckets?.some(b => b.name === 'content-cards')
        if (!bucketExists) {
          try {
            await supabase.storage.createBucket('content-cards', { public: true })
            console.log('[useCreateCard] Created content-cards bucket')
          } catch (err) {
            console.error('[useCreateCard] Failed to create bucket:', err.message)
            throw new Error('Storage bucket not found or inaccessible')
          }
        }
      } catch (err) {
        if (err.message.includes('Storage bucket')) throw err
        console.error('[useCreateCard] Bucket check failed:', err.message)
        throw new Error('Storage access failed. Please check Supabase configuration.')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Authentication failed. Please log in again.')
      }

      const ext = file.name ? file.name.split('.').pop() : 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('content-cards')
          .upload(fileName, file, { upsert: false })

        if (uploadError) {
          console.error('[useCreateCard] Upload failed:', uploadError.message)
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        if (!uploadData || !uploadData.path) {
          throw new Error('Upload succeeded but no path returned')
        }

        console.log('[useCreateCard] Uploaded to:', uploadData.path)

        // Strip content_text fields if they don't exist in DB yet (graceful degradation)
        const insertData = {
          category_id: cardData.category_id ?? null,
          language_id: cardData.language_id ?? null,
          festival_id: cardData.festival_id ?? null,
          occasions: cardData.occasions ?? [],
          tags: cardData.tags ?? [],
          priority: cardData.priority ?? 5,
          status: cardData.status ?? 'draft',
          scheduled_at: cardData.scheduled_at ?? null,
          image_url: uploadData.path,
          created_by: user.id,
        }

        if (cardData.content_text !== undefined) {
          insertData.content_text = cardData.content_text
        }
        if (cardData.content_text_language !== undefined) {
          insertData.content_text_language = cardData.content_text_language
        }

        const { data, error } = await supabase
          .from('content_cards')
          .insert([insertData])
          .select()
          .single()

        if (error) {
          console.error('[useCreateCard] Database insert failed:', error.message)
          try {
            await supabase.storage.from('content-cards').remove([uploadData.path])
          } catch (cleanupErr) {
            console.warn('[useCreateCard] Failed to clean up uploaded file:', cleanupErr.message)
          }
          throw new Error(`Failed to save card: ${error.message}`)
        }

        if (!data) {
          throw new Error('Card created but no data returned')
        }

        console.log('[useCreateCard] Card created:', data.id)
        return data
      } catch (err) {
        console.error('[useCreateCard] Mutation failed:', err.message)
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-cards'] })
      toast.success('Card created successfully')
    },
    onError: (err) => {
      const message = err.message || 'Failed to create card'
      console.error('[useCreateCard] Error:', message)
      toast.error(message)
    },
  })
}

export function useUpdateCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file, image_url, ...cardData }) => {
      let finalImageUrl = image_url

      if (file) {
        const ext = file.name ? file.name.split('.').pop() : 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('content-cards')
          .upload(fileName, file, { upsert: false })

        if (uploadError) throw uploadError
        finalImageUrl = uploadData.path
      }

      const updateData = {
        category_id: cardData.category_id ?? null,
        language_id: cardData.language_id ?? null,
        festival_id: cardData.festival_id ?? null,
        occasions: cardData.occasions ?? [],
        tags: cardData.tags ?? [],
        priority: cardData.priority ?? 5,
        status: cardData.status ?? 'draft',
        scheduled_at: cardData.scheduled_at ?? null,
        image_url: finalImageUrl,
        updated_at: new Date().toISOString(),
      }

      if (cardData.content_text !== undefined) {
        updateData.content_text = cardData.content_text
      }
      if (cardData.content_text_language !== undefined) {
        updateData.content_text_language = cardData.content_text_language
      }

      const { data, error } = await supabase
        .from('content_cards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['card', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-cards'] })
      toast.success('Card updated successfully')
    },
    onError: () => {
      toast.error('Failed to update card')
    },
  })
}

export function useDeleteCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, imagePath }) => {
      try {
        if (imagePath && !imagePath.startsWith('http')) {
          try {
            const { error: storageError } = await supabase.storage
              .from('content-cards')
              .remove([imagePath])
            if (storageError) {
              console.warn('[useDeleteCard] Failed to delete file:', storageError.message)
            } else {
              console.log('[useDeleteCard] Deleted file:', imagePath)
            }
          } catch (storageErr) {
            console.warn('[useDeleteCard] Storage deletion error:', storageErr.message)
          }
        }

        const { error } = await supabase
          .from('content_cards')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('[useDeleteCard] Delete failed:', error.message)
          throw new Error(`Failed to delete card: ${error.message}`)
        }

        console.log('[useDeleteCard] Card deleted:', id)
      } catch (err) {
        console.error('[useDeleteCard] Mutation failed:', err.message)
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-cards'] })
      toast.success('Card deleted')
    },
    onError: (err) => {
      const message = err.message || 'Failed to delete card'
      console.error('[useDeleteCard] Error:', message)
      toast.error(message)
    },
  })
}

export function usePublishCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('content_cards')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cards'] })
      const prev = queryClient.getQueryData(['cards'])
      queryClient.setQueriesData({ queryKey: ['cards'] }, (old) =>
        old?.map?.((c) => c.id === id ? { ...c, status: 'published' } : c) ?? old
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cards'], ctx.prev)
      toast.error('Failed to publish card')
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['card', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Card published')
    },
  })
}

export function useUnpublishCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('content_cards')
        .update({ status: 'draft', published_at: null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cards'] })
      const prev = queryClient.getQueryData(['cards'])
      queryClient.setQueriesData({ queryKey: ['cards'] }, (old) =>
        old?.map?.((c) => c.id === id ? { ...c, status: 'draft' } : c) ?? old
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['cards'], ctx.prev)
      toast.error('Failed to unpublish card')
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['card', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Card unpublished')
    },
  })
}
