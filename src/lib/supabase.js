import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const storageBase = `${supabaseUrl}/storage/v1`

export function getCardImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/render/image/public/content-cards/${path}?width=1080&height=1080&quality=80`
}

export function getCardThumbUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/render/image/public/content-cards/${path}?width=200&height=200&quality=60`
}

export function getBgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/render/image/public/background-templates/${path}?width=600&height=600&quality=80`
}

export function getPublicUrl(bucket, path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/object/public/${bucket}/${path}`
}
