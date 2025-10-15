import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://imexctmcesopdfdebsgo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZXhjdG1jZXNvcGRmZGVic2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMDczMDIsImV4cCI6MjA3NDg4MzMwMn0.g1lziVKAuUvMEOkYxJhe2D2z8PlwGJ6xcXo_SSpTj7Q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})
