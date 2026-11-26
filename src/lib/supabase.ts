import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const configurado = Boolean(url && key && !url.includes('SEU-PROJETO'))

export const sb = createClient(url || 'https://exemplo.supabase.co', key || 'chave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !Capacitor.isNativePlatform() /* no app o retorno vem pelo deep link */, flowType: 'pkce' },
})
