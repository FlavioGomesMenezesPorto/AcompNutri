import { Capacitor } from '@capacitor/core'
import { sb } from './supabase'

/**
 * Endereço da API própria.
 * - Web: vazio = mesma origem (em desenvolvimento o Vite repassa /api para a API local).
 * - App Android: obrigatório (ex.: https://api.seudominio.com), definido no build.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/+$/, '')

export const apiConfigurada = Boolean(BASE) || !Capacitor.isNativePlatform()

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

type Opcoes = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; query?: Record<string, string | number | undefined> }

/** Igual a api(), mas devolve { data, error } em vez de lançar erro. */
export async function tentar<T>(p: Promise<T>): Promise<{ data: T | null; error: Error | null }> {
  try { return { data: await p, error: null } } catch (e) { return { data: null, error: e as Error } }
}

/** Chama a API enviando o token de login do Supabase. */
export async function api<T = unknown>(caminho: string, { method = 'GET', body, query }: Opcoes = {}): Promise<T> {
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  const qs = query
    ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
    : ''

  let r: Response
  try {
    r = await fetch(`${BASE}/api${caminho}${qs}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.')
  }

  if (r.status === 204) return undefined as T
  const texto = await r.text()
  let json: unknown = null
  try { json = texto ? JSON.parse(texto) : null } catch { /* resposta não-JSON */ }
  if (!r.ok) {
    if (r.status === 401) await sb.auth.refreshSession().catch(() => {})
    throw new ApiError(r.status, (json as { error?: string } | null)?.error || `Erro ${r.status}`)
  }
  return json as T
}
