import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Check your environment variables.')
}

console.log('Initializing Supabase client with URL:', supabaseUrl ? 'Defined' : 'MISSING');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
