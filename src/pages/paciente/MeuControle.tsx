import { useEffect, useRef, useState } from 'react'
import { LogOut, CalendarDays, ListChecks, FileText, Check, ChevronLeft, ChevronRight, Plus, Pencil } from 'lucide-react'
import { addDays, parseISO, startOfWeek } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { hoje, mesKey, fmt, ymd, habitoAtivoEm } from '../../lib/datas'
import { useHabitosMes } from '../../lib/habitos'
import type { Compromisso, Habito } from '../../lib/types'
import { Avatar, Spinner, Vazio, toastErro } from '../../components/ui'
import { Marca } from '../../components/Layout'
import { MesPicker } from '../../components/MesPicker'
import { GradeHabitos, Legenda } from '../../components/GradeHabitos'
import { ResumoMes } from '../../components/ResumoMes'
import { HabitoModal } from '../../components/HabitoModal'
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
  const { habitos, registros, carregando, carregar, alternar, definir } = useHabitosMes(paciente.id, mes)
  const [modal, setModal] = useState<{ habito: Habito | null } | null>(null)

  useEffect(() => {
    api<Compromisso[]>(`/pacientes/${paciente.id}/compromissos`, { query: { futuros: 1, limite: 3 } })
      .then(setConsultas).catch(() => setConsultas([]))
  }, [paciente.id])

  // dia que o paciente está marcando (hoje ou um dia anterior que ficou para trás)
  const hj = hoje()
  const [dia, setDia] = useState(hj)
  const irParaDia = (d: string) => {
    if (d > hj) return
    setDia(d)
    if (mesKey(parseISO(d)) !== mesKey(mes)) setMes(parseISO(d)) // carrega os hábitos daquele mês
  }
  const doDia = habitos.filter((h) => habitoAtivoEm(h, dia))
  const feitosNoDia = doDia.filter((h) => registros[`${h.id}|${dia}`] === 'ok').length
  const mesDoDiaCarregado = mesKey(parseISO(dia)) === mesKey(mes)
  const rotuloDia = dia === hj ? 'Hoje' : dia === ymd(addDays(new Date(), -1)) ? 'Ontem' : fmt(dia, 'EEEE')

  // semana do dia escolhido, com a situação de cada dia (só do mês carregado)
  const semana = Array.from({ length: 7 }, (_, i) => ymd(addDays(startOfWeek(parseISO(dia), { weekStartsOn: 1 }), i)))
  const situacao = (d: string) => {
    if (d > hj || mesKey(parseISO(d)) !== mesKey(mes)) return 'fora'
    const hs = habitos.filter((h) => habitoAtivoEm(h, d))
    if (!hs.length) return 'fora'
    const marcados = hs.filter((h) => registros[`${h.id}|${d}`]).length
    return marcados === hs.length ? 'completo' : marcados ? 'parcial' : 'vazio'
  }

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
            <button key={id} onClick={() => { setAba(id); if (id === 'hoje') { setDia(hj); setMes(new Date()) } }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${aba === id ? 'bg-white text-sage-800 shadow-sm' : 'text-stone-500'}`}>
              <I size={15} />{label}
            </button>
          ))}
        </div>

        {carregando && !habitos.length ? <Spinner /> : aba === 'hoje' ? (
          <div className="space-y-5">
            <div className="card p-4">
              {/* navegação entre os dias */}
              <div className="mb-3 flex items-center gap-2">
                <button className="btn-ghost !p-2" onClick={() => irParaDia(ymd(addDays(parseISO(dia), -1)))} aria-label="Dia anterior"><ChevronLeft size={18} /></button>
                <div className="min-w-0 flex-1 text-center">
                  <h2 className="font-semibold capitalize">{rotuloDia}</h2>
                  <div className="text-xs capitalize text-stone-500">{fmt(dia, "d 'de' MMMM")}</div>
                </div>
                <button className="btn-ghost !p-2 disabled:opacity-30" disabled={dia >= hj} onClick={() => irParaDia(ymd(addDays(parseISO(dia), 1)))} aria-label="Próximo dia"><ChevronRight size={18} /></button>
              </div>

              {/* semana: verde = tudo marcado, amarelo = faltou algo, vermelho = nada marcado */}
              <div className="mb-4 grid grid-cols-7 gap-1">
                {semana.map((d) => {
                  const s = situacao(d)
                  return (
                    <button key={d} disabled={d > hj} onClick={() => irParaDia(d)}
                      className={`flex flex-col items-center rounded-lg py-1.5 text-xs transition disabled:opacity-30 ${d === dia ? 'bg-sage-600 text-white' : 'hover:bg-stone-100'}`}>
                      <span className="capitalize">{fmt(d, 'EEEEEE')}</span>
                      <span className="font-semibold tabular-nums">{d.slice(8)}</span>
                      <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${s === 'completo' ? 'bg-ok' : s === 'parcial' ? 'bg-amber-400' : s === 'vazio' ? 'bg-nao' : 'bg-transparent'}`} />
                    </button>
                  )
                })}
              </div>

              {!mesDoDiaCarregado || carregando ? <Spinner /> : doDia.length === 0 ? (
                <Vazio icone={<ListChecks />} titulo="Nenhum hábito neste dia"
                  texto="Adicione o que você quer acompanhar: dieta, água, treino, sono… Seu nutricionista também pode cadastrar." />
              ) : (
                <>
                  <div className="mb-2 text-right text-xs text-stone-500">{feitosNoDia}/{doDia.length} consegui</div>
                  <ul className="space-y-2">
                    {doDia.map((h) => {
                      const s = registros[`${h.id}|${dia}`]
                      return (
                        <li key={h.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: h.cor }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 font-medium">
                              <span className="truncate">{h.nome}</span>
                              {h.criado_pelo_paciente && (
                                <button className="shrink-0 p-1 text-stone-400 hover:text-stone-700" onClick={() => setModal({ habito: h })} aria-label={`Editar ${h.nome}`}><Pencil size={13} /></button>
                              )}
                            </div>
                            {h.meta && <div className="truncate text-xs text-stone-500">{h.meta}</div>}
                          </div>
                          <BotaoStatus ativo={s === 'ok'} tipo="ok" onClick={() => definir(h.id, dia, s === 'ok' ? undefined : 'ok')} />
                          <BotaoStatus ativo={s === 'nao'} tipo="nao" onClick={() => definir(h.id, dia, s === 'nao' ? undefined : 'nao')} />
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
              <button className="btn-outline mt-3 w-full" onClick={() => setModal({ habito: null })}><Plus size={15} />Adicionar hábito</button>
              {dia !== hj && <button className="btn-ghost mt-1 w-full text-sm" onClick={() => irParaDia(hj)}>Voltar para hoje</button>}
            </div>
            <Observacoes pacienteId={paciente.id} mes={parseISO(dia)} />
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
            <p className="text-xs text-stone-500">Toque num quadrinho para marcar: vazio → ✓ consegui → ✗ não consegui.</p>
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
      <HabitoModal aberto={!!modal} onFechar={() => setModal(null)} pacienteId={paciente.id} habito={modal?.habito ?? null}
        proximaOrdem={habitos.length} onSalvo={carregar} />
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
