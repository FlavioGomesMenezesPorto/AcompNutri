import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { Plus, CalendarDays, MapPin, Clock } from 'lucide-react'
import { api, tentar } from '../../lib/api'
import { fmt, ymd } from '../../lib/datas'
import { TIPOS, STATUS, type Compromisso } from '../../lib/types'
import { Cabecalho } from '../../components/Layout'
import { MesPicker } from '../../components/MesPicker'
import { CompromissoModal } from '../../components/CompromissoModal'
import { Vazio, toastErro } from '../../components/ui'

export default function Agenda() {
  const [mes, setMes] = useState(new Date())
  const [dia, setDia] = useState(new Date())
  const [itens, setItens] = useState<Compromisso[]>([])
  const [modal, setModal] = useState<{ c: Compromisso | null; data?: string } | null>(null)

  const grade = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mes)), fim = endOfWeek(endOfMonth(mes))
    const out: Date[] = []
    for (let d = ini; d <= fim; d = addDays(d, 1)) out.push(d)
    return out
  }, [mes])

  const carregar = useCallback(async () => {
    const { data, error } = await tentar(api<Compromisso[]>('/compromissos', {
      query: { de: grade[0]!.toISOString(), ate: endOfWeek(endOfMonth(mes)).toISOString() },
    }))
    if (error) return toastErro(error)
    setItens(data!)
  }, [grade, mes])
  useEffect(() => { carregar() }, [carregar])

  const porDia = useMemo(() => {
    const m: Record<string, Compromisso[]> = {}
    for (const c of itens) (m[ymd(parseISO(c.inicio))] ??= []).push(c)
    return m
  }, [itens])
  const doDia = porDia[ymd(dia)] ?? []

  return (
    <>
      <Cabecalho titulo="Agenda" sub="Consultas, retornos e lembretes"
        acoes={<>
          <MesPicker mes={mes} onChange={(d) => { setMes(d); setDia(isSameMonth(d, new Date()) ? new Date() : startOfMonth(d)) }} />
          <button className="btn-primary" onClick={() => setModal({ c: null, data: ymd(dia) })}><Plus size={16} />Novo</button>
        </>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-medium text-stone-500">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grade.map((d) => {
              const lista = porDia[ymd(d)] ?? []
              const sel = isSameDay(d, dia)
              return (
                <button key={d.toISOString()} onClick={() => setDia(d)} onDoubleClick={() => setModal({ c: null, data: ymd(d) })}
                  className={`min-h-[64px] border-b border-r border-stone-100 p-1 text-left align-top transition sm:min-h-[92px] ${isSameMonth(d, mes) ? '' : 'bg-stone-50/60 text-stone-400'} ${sel ? 'bg-sage-50 ring-2 ring-inset ring-sage-400' : 'hover:bg-stone-50'}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(d) ? 'bg-sage-600 font-semibold text-white' : ''}`}>{d.getDate()}</span>
                  <div className="mt-0.5 hidden space-y-0.5 sm:block">
                    {lista.slice(0, 3).map((c) => (
                      <div key={c.id} className={`truncate rounded px-1 text-[11px] ${c.status === 'cancelado' ? 'line-through opacity-50' : ''}`}
                        style={{ background: TIPOS[c.tipo].cor + '1f', color: TIPOS[c.tipo].cor }}>
                        {format(parseISO(c.inicio), 'HH:mm')} {c.pacientes?.nome.split(' ')[0] ?? c.titulo}
                      </div>
                    ))}
                    {lista.length > 3 && <div className="px-1 text-[10px] text-stone-500">+{lista.length - 3}</div>}
                  </div>
                  {lista.length > 0 && (
                    <div className="mt-1 flex gap-0.5 sm:hidden">
                      {lista.slice(0, 4).map((c) => <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ background: TIPOS[c.tipo].cor }} />)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold capitalize">{fmt(dia, "EEEE, d 'de' MMMM")}</h2>
            <button className="btn-ghost !p-1.5" onClick={() => setModal({ c: null, data: ymd(dia) })} aria-label="Novo neste dia"><Plus size={16} /></button>
          </div>
          {doDia.length === 0 ? (
            <Vazio icone={<CalendarDays size={20} />} titulo="Dia livre" texto="Toque em + para agendar." />
          ) : (
            <ul className="space-y-2">
              {doDia.map((c) => <ItemAgenda key={c.id} c={c} onClick={() => setModal({ c })} />)}
            </ul>
          )}
        </div>
      </div>

      <CompromissoModal aberto={!!modal} onFechar={() => setModal(null)} compromisso={modal?.c ?? null} dataInicial={modal?.data} onSalvo={carregar} />
    </>
  )
}

export function ItemAgenda({ c, onClick, mostrarData }: { c: Compromisso; onClick?: () => void; mostrarData?: boolean }) {
  return (
    <li>
      <button onClick={onClick} disabled={!onClick} className="flex w-full gap-3 rounded-xl border border-stone-200 p-3 text-left transition enabled:hover:border-stone-300 enabled:hover:bg-stone-50">
        <span className="w-1 shrink-0 rounded-full" style={{ background: TIPOS[c.tipo].cor }} />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-medium ${c.status === 'cancelado' ? 'line-through opacity-60' : ''}`}>{c.titulo}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
            <span className="flex items-center gap-1"><Clock size={12} />{mostrarData && fmt(c.inicio, 'EEE dd/MM · ')}{fmt(c.inicio, 'HH:mm')}{c.fim && `–${fmt(c.fim, 'HH:mm')}`}</span>
            {c.local && <span className="flex items-center gap-1 truncate"><MapPin size={12} />{c.local}</span>}
          </div>
        </div>
        {c.status !== 'agendado' && <span className={`chip h-fit ${c.status === 'realizado' ? 'bg-sage-100 text-sage-700' : 'bg-red-50 text-nao'}`}>{STATUS[c.status]}</span>}
      </button>
    </li>
  )
}
