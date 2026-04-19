import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const CARD_SELECT = `
  *,
  content_text,
  content_text_language,
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
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
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

      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.name === 'content-cards')
      if (!bucketExists) {
        await supabase.storage.createBucket('content-cards', { public: true })
      }

      const userId = (await supabase.auth.getUser()).data?.user?.id
      const ext = file.name ? file.name.split('.').pop() : 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-cards')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('content_cards')
        .insert([{
          ...cardData,
          image_url: uploadData.path,
          created_by: userId || null,
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-cards'] })
      toast.success('Card created successfully')
    },
    onError: (err) => {
      toast.error(err.message?.includes('bucket') ? 'Storage bucket not found — create "content-cards" bucket in Supabase' : 'Failed to create card')
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

      const { data, error } = await supabase
        .from('content_cards')
        .update({ ...cardData, image_url: finalImageUrl, updated_at: new Date().toISOString() })
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
      if (imagePath && !imagePath.startsWith('http')) {
        await supabase.storage.from('content-cards').remove([imagePath])
      }
      const { error } = await supabase.from('content_cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-cards'] })
      toast.success('Card deleted')
    },
    onError: () => {
      toast.error('Failed to delete card')
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
