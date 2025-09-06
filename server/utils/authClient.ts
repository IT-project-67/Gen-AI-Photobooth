import { createClient } from '@supabase/supabase-js'

// Create Supabase client for authentication
export const createAuthClient = () => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseAnonKey = config.public.supabaseAnonKey as string
  
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable')
  }
  
  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false // Server-side should not persist sessions
    }
  })
}

// Create Supabase Admin client for server-side operations
export const createAdminClient = () => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseServiceKey = config.supabaseServiceRoleKey as string
  
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable')
  }
  
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
