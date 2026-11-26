import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { diasDoMes, habitoAtivoEm, hoje, mesKey, ymd } from './datas'
import type { Habito, Registro, StatusRegistro } from './types'
import { toastErro } from '../components/ui'

/** Carrega hábitos do paciente ativos no mês + marcações do mês. */
export function useHabitosMes(pacienteId: string | undefined, mes: Date) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [registros, setRegistros] = useState<Record<string, StatusRegistro>>({}) // chave `${habito}|${data}`
  const [carregando, setCarregando] = useState(true)

  const inicio = mesKey(mes)

  const carregar = useCallback(async () => {
    if (!pacienteId) return
    setCarregando(true)
    try {
      const r = await api<{ habitos: Habito[]; registros: Registro[] }>(`/pacientes/${pacienteId}/habitos`, { query: { mes: inicio } })
      setHabitos(r.habitos)
      setRegistros(Object.fromEntries(r.registros.map((x) => [`${x.habito_id}|${x.data}`, x.status])))
    } catch (e) {
      toastErro(e)
    } finally {
      setCarregando(false)
    }
  }, [pacienteId, inicio])

  useEffect(() => { carregar() }, [carregar])

  /** Define a marcação de um dia (undefined = apagar), com atualização otimista. */
  const definir = useCallback(async (habitoId: string, data: string, prox: StatusRegistro | undefined) => {
    const k = `${habitoId}|${data}`
    const atual = registros[k]
    if (atual === prox) return
    setRegistros((r) => {
      const n = { ...r }
      if (prox) n[k] = prox; else delete n[k]
      return n
    })
    try {
      await api(`/habitos/${habitoId}/registros/${data}`, { method: 'PUT', body: { status: prox ?? null } })
    } catch (error) {
      toastErro(error)
      setRegistros((r) => { const n = { ...r }; if (atual) n[k] = atual; else delete n[k]; return n })
    }
  }, [registros])

  /** Ciclo da folha: vazio → consegui → não consegui → vazio */
  const alternar = useCallback((habitoId: string, data: string) => {
    const atual = registros[`${habitoId}|${data}`]
    return definir(habitoId, data, !atual ? 'ok' : atual === 'ok' ? 'nao' : undefined)
  }, [registros, definir])

  return { habitos, registros, carregando, carregar, alternar, definir }
}

export type EstatHabito = {
  habito: Habito
  ok: number
  nao: number
  vazio: number
  diasConsiderados: number
  pct: number
  melhorSequencia: number
}

/** Estatística do mês: considera só dias em que o hábito estava ativo e que já passaram. */
export function estatisticas(habitos: Habito[], registros: Record<string, StatusRegistro>, mes: Date): EstatHabito[] {
  const hj = hoje()
  const dias = diasDoMes(mes).map(ymd).filter((d) => d <= hj)
  return habitos.map((h) => {
    let ok = 0, nao = 0, vazio = 0, seq = 0, melhor = 0
    const ds = dias.filter((d) => habitoAtivoEm(h, d))
    for (const d of ds) {
      const s = registros[`${h.id}|${d}`]
      if (s === 'ok') { ok++; seq++; melhor = Math.max(melhor, seq) }
      else { seq = 0; if (s === 'nao') nao++; else vazio++ }
    }
    return { habito: h, ok, nao, vazio, diasConsiderados: ds.length, pct: ds.length ? Math.round((ok / ds.length) * 100) : 0, melhorSequencia: melhor }
  })
}

export function adesaoGeral(est: EstatHabito[]) {
  const tot = est.reduce((a, e) => a + e.diasConsiderados, 0)
  const ok = est.reduce((a, e) => a + e.ok, 0)
  return tot ? Math.round((ok / tot) * 100) : null
}

export const corPct = (p: number | null) => (p == null ? 'text-stone-400' : p >= 70 ? 'text-ok' : p >= 40 ? 'text-amber-600' : 'text-nao')
