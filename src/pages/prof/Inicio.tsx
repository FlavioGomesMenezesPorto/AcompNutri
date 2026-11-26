import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import { CalendarDays, Users, Plus, AlertTriangle, ChevronRight, Activity } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmt } from '../../lib/datas'
import { corPct } from '../../lib/habitos'
import type { Compromisso, Paciente } from '../../lib/types'
import { Avatar, Spinner, Vazio, toastErro } from '../../components/ui'
import { Cabecalho } from '../../components/Layout'
import { CompromissoModal } from '../../components/CompromissoModal'
import { ItemAgenda } from './Agenda'

export default function Inicio() {
  const { profissional } = useAuth()
  const [hojeLista, setHojeLista] = useState<Compromisso[] | null>(null)
  const [proximos, setProximos] = useState<Compromisso[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [adesao, setAdesao] = useState<Record<string, number | null>>({})
  const [modal, setModal] = useState<Compromisso | null | undefined>(undefined)

  const carregar = useCallback(async () => {
    const agora = new Date()
    try {
      const [a, b, c, d] = await Promise.all([
        api<Compromisso[]>('/compromissos', { query: { de: startOfDay(agora).toISOString(), ate: endOfDay(agora).toISOString() } }),
        api<Compromisso[]>('/compromissos', { query: { de: new Date(endOfDay(agora).getTime() + 1).toISOString(), ate: endOfDay(addDays(agora, 7)).toISOString(), semCancelados: 1, limite: 8 } }),
        api<Paciente[]>('/pacientes', { query: { ativos: 1 } }),
        api<Record<string, number | null>>('/pacientes/adesao'),
      ])
      setHojeLista(a); setProximos(b); setPacientes(c); setAdesao(d)
    } catch (e) {
      toastErro(e); setHojeLista([])
    }
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const comAdesao = pacientes.map((p) => ({ p, a: adesao[p.id] ?? null })).filter((x) => x.a != null)
  const media = comAdesao.length ? Math.round(comAdesao.reduce((s, x) => s + x.a!, 0) / comAdesao.length) : null
  const atencao = comAdesao.filter((x) => x.a! < 50).sort((x, y) => x.a! - y.a!).slice(0, 5)
  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <>
      <Cabecalho titulo={`${saudacao}, ${profissional?.nome.split(' ')[0]}!`} sub={fmt(new Date(), "EEEE, d 'de' MMMM")}
        acoes={<button className="btn-primary" onClick={() => setModal(null)}><Plus size={16} />Agendar</button>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<CalendarDays size={16} />} t="Hoje" v={hojeLista ? String(hojeLista.filter((c) => c.status !== 'cancelado').length) : '…'} s="compromissos" />
        <Stat icon={<Users size={16} />} t="Pacientes" v={String(pacientes.length)} s="em acompanhamento" />
        <Stat icon={<Activity size={16} />} t="Adesão média" v={media == null ? '—' : `${media}%`} s="hábitos no mês" cls={corPct(media)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Agenda de hoje</h2>
            <Link to="/agenda" className="text-sm text-sage-700 hover:underline">Ver agenda</Link>
          </div>
          {!hojeLista ? <Spinner /> : hojeLista.length === 0
            ? <Vazio icone={<CalendarDays size={20} />} titulo="Nada agendado para hoje" />
            : <ul className="space-y-2">{hojeLista.map((c) => <ItemAgenda key={c.id} c={c} onClick={() => setModal(c)} />)}</ul>}
          {proximos.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-stone-500">Próximos 7 dias</h3>
              <ul className="space-y-2">{proximos.map((c) => <ItemAgenda key={c.id} c={c} mostrarData onClick={() => setModal(c)} />)}</ul>
            </>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-amber-500" />Precisam de atenção</h2>
            <Link to="/pacientes" className="text-sm text-sage-700 hover:underline">Todos</Link>
          </div>
          {pacientes.length === 0 ? (
            <Vazio icone={<Users size={20} />} titulo="Nenhum paciente ainda" acao={<Link to="/pacientes" className="btn-primary"><Plus size={16} />Cadastrar paciente</Link>} />
          ) : atencao.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Todos os pacientes com adesão acima de 50% este mês. 🎉</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {atencao.map(({ p, a }) => (
                <li key={p.id}>
                  <Link to={`/pacientes/${p.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <Avatar nome={p.nome} size={34} />
                    <span className="flex-1 truncate text-sm font-medium">{p.nome}</span>
                    <span className={`text-sm font-semibold ${corPct(a)}`}>{a}%</span>
                    <ChevronRight size={15} className="text-stone-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CompromissoModal aberto={modal !== undefined} onFechar={() => setModal(undefined)} compromisso={modal ?? null} onSalvo={carregar} />
    </>
  )
}

function Stat({ icon, t, v, s, cls = '' }: { icon: React.ReactNode; t: string; v: string; s: string; cls?: string }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500"><span className="text-sage-600">{icon}</span>{t}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{v}</div>
      <div className="truncate text-[11px] text-stone-500">{s}</div>
    </div>
  )
}
