import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const storageBase = `${supabaseUrl}/storage/v1/object/public`

// Direct public URLs — no image transformation add-on required
export function getCardImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/content-cards/${path}`
}

export function getCardThumbUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/content-cards/${path}`
}

export function getBgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/background-templates/${path}`
}

export function getPublicUrl(bucket, path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${storageBase}/${bucket}/${path}`
}
