import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const imageTransformEnabled = (import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM ?? 'false') === 'true'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const objectPublicBase = `${supabaseUrl}/storage/v1/object/public`
const renderPublicBase = `${supabaseUrl}/storage/v1/render/image/public`

function isAbsoluteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

export function getCardImageUrl(path) {
  if (!path) return null
  if (isAbsoluteUrl(path)) return path

  if (!imageTransformEnabled) {
    return `${objectPublicBase}/content-cards/${path}`
  }

  return `${renderPublicBase}/content-cards/${path}?width=1080&height=1920&quality=85`
}

export function getCardThumbUrl(path) {
  if (!path) return null
  if (isAbsoluteUrl(path)) return path

  if (!imageTransformEnabled) {
    return `${objectPublicBase}/content-cards/${path}`
  }

  return `${renderPublicBase}/content-cards/${path}?width=405&height=720&quality=70`
}

export function getBgUrl(path) {
  if (!path) return null
  if (isAbsoluteUrl(path)) return path
  return `${objectPublicBase}/background-templates/${path}`
}

export function getPublicUrl(bucket, path) {
  if (!path) return null
  if (isAbsoluteUrl(path)) return path
  return `${objectPublicBase}/${bucket}/${path}`
}
