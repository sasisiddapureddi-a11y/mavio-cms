import { create } from 'zustand'
import { supabase } from '../lib/supabase'

async function fetchCmsUser(userId) {
  const { data, error } = await supabase
    .from('cms_users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[authStore] cms_users query failed:', error.message, error.code)
    throw new Error('Access denied. Your account is not registered as a CMS user. Contact your administrator.')
  }
  return data
}

// Module-level guard prevents duplicate subscriptions in React StrictMode
let authSubscription = null

const useAuthStore = create((set) => ({
  user: null,
  cmsUser: null,
  loading: true,
  dbError: null,

  init: async () => {
    set({ loading: true, dbError: null })

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      try {
        const cmsUser = await fetchCmsUser(session.user.id)
        if (cmsUser && cmsUser.is_active) {
          set({ user: session.user, cmsUser, loading: false })
        } else {
          await supabase.auth.signOut()
          set({ user: null, cmsUser: null, loading: false })
        }
      } catch {
        set({
          user: null,
          cmsUser: null,
          loading: false,
          dbError: 'Database error: cms_users table may not exist or RLS policy is missing. Check the browser console and Supabase setup.',
        })
      }
    } else {
      set({ user: null, cmsUser: null, loading: false })
    }

    if (authSubscription) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, cmsUser: null, dbError: null })
      } else if (event === 'SIGNED_IN' && session?.user) {
        try {
          const cmsUser = await fetchCmsUser(session.user.id)
          if (cmsUser && cmsUser.is_active) {
            set({ user: session.user, cmsUser })
          } else {
            await supabase.auth.signOut()
            set({ user: null, cmsUser: null })
          }
        } catch {
          set({ user: null, cmsUser: null })
        }
      }
    })
    authSubscription = subscription
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    try {
      const cmsUser = await fetchCmsUser(data.user.id)
      if (!cmsUser || !cmsUser.is_active) {
        await supabase.auth.signOut()
        throw new Error('You are not authorized to access this CMS.')
      }
      set({ user: data.user, cmsUser })
      return data
    } catch (err) {
      await supabase.auth.signOut()
      if (err.message?.includes('not authorized')) throw err
      throw new Error('Database error: cms_users table is missing or RLS policy is not configured. Run the setup SQL in Supabase.')
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, cmsUser: null, dbError: null })
  },
}))

export default useAuthStore
