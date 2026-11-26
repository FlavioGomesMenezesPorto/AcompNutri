import { useEffect, useRef, useState } from 'react'
import { LogOut, CalendarDays, ListChecks, FileText, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { hoje, mesKey, fmt } from '../../lib/datas'
import { useHabitosMes } from '../../lib/habitos'
import type { Compromisso } from '../../lib/types'
import { Avatar, Spinner, Vazio, toastErro } from '../../components/ui'
import { Marca } from '../../components/Layout'
import { MesPicker } from '../../components/MesPicker'
import { GradeHabitos, Legenda } from '../../components/GradeHabitos'
import { ResumoMes } from '../../components/ResumoMes'
import { ItemAgenda } from '../prof/Agenda'

/** Tela do paciente/aluno: marca os hábitos, escreve observações e vê o resumo compartilhado. */
export default function MeuControle() {
  const { pacientes, user, sair } = useAuth()
  const [idx, setIdx] = useState(0)
  const paciente = pacientes[idx]!
  const [mes, setMes] = useState(new Date())
  const [aba, setAba] = useState<'hoje' | 'mes' | 'resumo'>('hoje')
  const prof = paciente.profissional ?? null
  const [consultas, setConsultas] = useState<Compromisso[]>([])
  const { habitos, registros, carregando, alternar, definir } = useHabitosMes(paciente.id, mes)

  useEffect(() => {
    api<Compromisso[]>(`/pacientes/${paciente.id}/compromissos`, { query: { futuros: 1, limite: 3 } })
      .then(setConsultas).catch(() => setConsultas([]))
  }, [paciente.id])

  const hj = hoje()
  const deHoje = habitos.filter((h) => h.inicio <= hj && (!h.fim || h.fim >= hj))
  const feitosHoje = deHoje.filter((h) => registros[`${h.id}|${hj}`] === 'ok').length
  const ehMesAtual = mesKey(mes) === mesKey(new Date())

  return (
    <div className="min-h-screen">
      <header className="no-print safe-top sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Marca />
          <div className="flex items-center gap-2">
            <Avatar nome={paciente.nome} url={user?.user_metadata?.avatar_url as string | undefined} size={30} />
            <button className="btn-ghost !p-1.5" onClick={sair} aria-label="Sair"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-5">
        <div className="no-print">
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {paciente.nome.split(' ')[0]}!</h1>
          <p className="text-sm text-stone-500">{prof ? `Acompanhamento com ${prof.nome}` : 'Seu controle de hábitos'}</p>
          {pacientes.length > 1 && (
            <select className="input mt-2 max-w-xs" value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
              {pacientes.map((p, i) => <option key={p.id} value={i}>Acompanhamento {i + 1}</option>)}
            </select>
          )}
        </div>

        <div className="no-print my-5 flex gap-1 rounded-xl bg-stone-100 p-1">
          {([['hoje', 'Hoje', ListChecks], ['mes', 'Meu mês', CalendarDays], ['resumo', 'Resumo', FileText]] as const).map(([id, label, I]) => (
            <button key={id} onClick={() => { setAba(id); if (id === 'hoje') setMes(new Date()) }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${aba === id ? 'bg-white text-sage-800 shadow-sm' : 'text-stone-500'}`}>
              <I size={15} />{label}
            </button>
          ))}
        </div>

        {carregando && !habitos.length ? <Spinner /> : aba === 'hoje' ? (
          <div className="space-y-5">
            <div className="card p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold capitalize">{fmt(new Date(), "EEEE, d 'de' MMMM")}</h2>
                {deHoje.length > 0 && <span className="text-sm text-stone-500">{feitosHoje}/{deHoje.length} feitos</span>}
              </div>
              {!ehMesAtual ? null : deHoje.length === 0 ? (
                <Vazio icone={<ListChecks />} titulo="Nenhum hábito ainda" texto="Seu nutricionista vai cadastrar os hábitos que você vai acompanhar." />
              ) : (
                <ul className="space-y-2">
                  {deHoje.map((h) => {
                    const s = registros[`${h.id}|${hj}`]
                    return (
                      <li key={h.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                        <span className="h-9 w-1.5 rounded-full" style={{ background: h.cor }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{h.nome}</div>
                          {h.meta && <div className="text-xs text-stone-500">{h.meta}</div>}
                        </div>
                        <BotaoStatus ativo={s === 'ok'} tipo="ok" onClick={() => definir(h.id, hj, s === 'ok' ? undefined : 'ok')} />
                        <BotaoStatus ativo={s === 'nao'} tipo="nao" onClick={() => definir(h.id, hj, s === 'nao' ? undefined : 'nao')} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <Observacoes pacienteId={paciente.id} mes={new Date()} />
            {consultas.length > 0 && (
              <div className="card p-4">
                <h2 className="mb-3 font-semibold">Próximas consultas</h2>
                <ul className="space-y-2">{consultas.map((c) => <ItemAgenda key={c.id} c={c} mostrarData />)}</ul>
              </div>
            )}
          </div>
        ) : aba === 'mes' ? (
          <div className="space-y-3">
            <MesPicker mes={mes} onChange={setMes} />
            {habitos.length === 0 ? <div className="card"><Vazio icone={<CalendarDays />} titulo="Sem hábitos neste mês" /></div> : <>
              <GradeHabitos mes={mes} habitos={habitos} registros={registros} onAlternar={alternar} />
              <Legenda />
            </>}
            <Observacoes pacienteId={paciente.id} mes={mes} />
          </div>
        ) : (
          <div className="space-y-4">
            <MesPicker mes={mes} onChange={setMes} />
            <ResumoMes paciente={paciente} mes={mes} habitos={habitos} registros={registros} editavel={false} nomeProfissional={prof?.nome} />
          </div>
        )}
        <p className="no-print mt-10 text-center font-script text-lg text-sage-600">Pequenas ações constroem grandes transformações</p>
      </main>
    </div>
  )

}

function BotaoStatus({ ativo, tipo, onClick }: { ativo: boolean; tipo: 'ok' | 'nao'; onClick: () => void }) {
  const ok = tipo === 'ok'
  return (
    <button onClick={onClick} aria-label={ok ? 'Consegui' : 'Não consegui'} aria-pressed={ativo}
      className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg font-bold transition ${ativo ? (ok ? 'border-ok bg-ok text-white' : 'border-nao bg-nao text-white') : ok ? 'border-stone-200 text-stone-300 hover:border-ok hover:text-ok' : 'border-stone-200 text-stone-300 hover:border-nao hover:text-nao'}`}>
      {ok ? <Check size={20} strokeWidth={3} /> : '✕'}
    </button>
  )
}

function Observacoes({ pacienteId, mes }: { pacienteId: string; mes: Date }) {
  const chave = mesKey(mes)
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'' | 'salvando' | 'salvo'>('')
  const timer = useRef<number>()

  useEffect(() => {
    setTexto(''); setEstado('')
    api<{ texto: string }>(`/pacientes/${pacienteId}/observacoes`, { query: { mes: chave } }).then((o) => setTexto(o.texto)).catch(toastErro)
  }, [pacienteId, chave])

  function mudar(v: string) {
    setTexto(v); setEstado('salvando')
    clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      try {
        await api(`/pacientes/${pacienteId}/observacoes`, { method: 'PUT', query: { mes: chave }, body: { texto: v } })
        setEstado('salvo')
      } catch (e) { toastErro(e); setEstado('') }
    }, 800)
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Observações do mês</h2>
        <span className="text-xs text-stone-400">{estado === 'salvando' ? 'Salvando…' : estado === 'salvo' ? 'Salvo ✓' : ''}</span>
      </div>
      <textarea rows={4} maxLength={4000} className="input" value={texto} onChange={(e) => mudar(e.target.value)}
        placeholder="Como foi? Dificuldades, dias especiais, sintomas, o que quiser contar ao seu nutricionista…" />
    </div>
  )
}
