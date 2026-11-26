import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { sb, configurado } from './supabase'
import type { Paciente, Profissional } from './types'
import { barraStatus, ehApp, entrarGoogleNoApp, esconderSplash, iniciarNativo } from './nativo'
import { fecharModalDoTopo } from '../components/ui'
import { api } from './api'

type Papel = 'carregando' | 'anonimo' | 'novo' | 'profissional' | 'paciente' | 'erro'

type Ctx = {
  user: User | null
  papel: Papel
  erro: string | null
  profissional: Profissional | null
  pacientes: Paciente[] // cadastros em que este usuário é o paciente
  recarregar: () => Promise<void>
  entrar: () => Promise<void>
  sair: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [papel, setPapel] = useState<Papel>(configurado ? 'carregando' : 'anonimo')
  const [profissional, setProfissional] = useState<Profissional | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])

  const [erro, setErro] = useState<string | null>(null)

  const carregarPerfil = useCallback(async (u: User | null) => {
    if (!u) {
      setProfissional(null); setPacientes([]); setPapel('anonimo')
      return
    }
    try {
      // a API também liga o e-mail Google ao cadastro feito pelo nutricionista
      const me = await api<{ papel: 'novo' | 'profissional' | 'paciente'; profissional: Profissional | null; pacientes: Paciente[] }>('/me')
      setProfissional(me.profissional)
      setPacientes(me.pacientes)
      setErro(null)
      setPapel(me.papel)
    } catch (e) {
      setErro((e as Error).message)
      setPapel('erro')
    }
  }, [])

  useEffect(() => { iniciarNativo(fecharModalDoTopo) }, [])
  useEffect(() => {
    barraStatus(papel === 'carregando' || papel === 'anonimo')
    if (papel !== 'carregando') esconderSplash()
  }, [papel])

  useEffect(() => {
    if (!configurado) return
    let ultimo: string | null | undefined
    const { data } = sb.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user ?? null
      if ((u?.id ?? null) === ultimo) return
      ultimo = u?.id ?? null
      setUser(u)
      // fora do callback, como recomenda a documentação do Supabase
      setTimeout(() => { carregarPerfil(u) }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [carregarPerfil])

  const value: Ctx = {
    user, papel, erro, profissional, pacientes,
    recarregar: () => carregarPerfil(user),
    entrar: async () => {
      if (ehApp) {
        try { await entrarGoogleNoApp() } catch (e) { alert('Não foi possível entrar: ' + (e as Error).message) }
        return
      }
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/' },
      })
      if (error) alert('Não foi possível entrar: ' + error.message)
    },
    sair: async () => { await sb.auth.signOut() },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
