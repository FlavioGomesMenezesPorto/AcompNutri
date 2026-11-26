import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, CalendarPlus, Archive, ArchiveRestore, Trash2, Smartphone, Mail, Phone, ListChecks, FileText, CalendarDays, IdCard } from 'lucide-react'
import { api, tentar } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmt, idade } from '../../lib/datas'
import { useHabitosMes } from '../../lib/habitos'
import type { Compromisso, Habito, Paciente } from '../../lib/types'
import { Avatar, Spinner, Vazio, toast, toastErro } from '../../components/ui'
import { MesPicker } from '../../components/MesPicker'
import { GradeHabitos, Legenda } from '../../components/GradeHabitos'
import { HabitoModal } from '../../components/HabitoModal'
import { PacienteModal } from '../../components/PacienteModal'
import { ResumoMes } from '../../components/ResumoMes'
import { CompromissoModal } from '../../components/CompromissoModal'
import { ItemAgenda } from './Agenda'

type Aba = 'habitos' | 'resumo' | 'consultas' | 'dados'
const ABAS: { id: Aba; label: string; icon: typeof ListChecks }[] = [
  { id: 'habitos', label: 'Hábitos', icon: ListChecks },
  { id: 'resumo', label: 'Resumo do mês', icon: FileText },
  { id: 'consultas', label: 'Consultas', icon: CalendarDays },
  { id: 'dados', label: 'Dados', icon: IdCard },
]

export default function PacienteDetalhe() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profissional } = useAuth()
  const [p, setP] = useState<Paciente | null>(null)
  const [erro, setErro] = useState(false)
  const [aba, setAba] = useState<Aba>('habitos')
  const [mes, setMes] = useState(new Date())
  const [habitoModal, setHabitoModal] = useState<{ h: Habito | null } | null>(null)
  const [editar, setEditar] = useState(false)
  const [agendar, setAgendar] = useState<Compromisso | null | undefined>(undefined)
  const [consultas, setConsultas] = useState<Compromisso[]>([])
  const { habitos, registros, carregando, carregar, alternar } = useHabitosMes(id, mes)

  useEffect(() => {
    api<Paciente>(`/pacientes/${id}`).then(setP).catch(() => setErro(true))
  }, [id])

  const carregarConsultas = useCallback(async () => {
    const { data } = await tentar(api<Compromisso[]>(`/pacientes/${id}/compromissos`))
    setConsultas(data ?? [])
  }, [id])
  useEffect(() => { carregarConsultas() }, [carregarConsultas])

  if (erro) return <Vazio icone={<IdCard />} titulo="Paciente não encontrado" acao={<Link to="/pacientes" className="btn-outline">Voltar</Link>} />
  if (!p) return <Spinner />

  async function arquivar() {
    const { data, error } = await tentar(api<Paciente>(`/pacientes/${p!.id}`, { method: 'PATCH', body: { ativo: !p!.ativo } }))
    if (error || !data) return toastErro(error)
    setP(data); toast(data.ativo ? 'Paciente reativado' : 'Paciente arquivado')
  }
  async function excluir() {
    if (!confirm(`Excluir ${p!.nome} e TODO o histórico (hábitos, marcações, resumos)? Isso não pode ser desfeito.\n\nDica: "Arquivar" esconde o paciente sem apagar nada.`)) return
    const { error } = await tentar(api(`/pacientes/${p!.id}`, { method: 'DELETE' }))
    if (error) return toastErro(error)
    toast('Paciente excluído'); nav('/pacientes')
  }

  const anos = idade(p.data_nascimento)
  const agora = new Date().toISOString()
  const proxima = [...consultas].reverse().find((c) => c.inicio >= agora && c.status === 'agendado')

  return (
    <>
      <Link to="/pacientes" className="no-print mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"><ArrowLeft size={15} />Pacientes</Link>

      <div className="no-print mb-5 flex flex-wrap items-center gap-4">
        <Avatar nome={p.nome} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {p.nome}
            {!p.ativo && <span className="chip bg-stone-100 text-stone-500">arquivado</span>}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
            {anos != null && <span>{anos} anos</span>}
            {p.objetivo && <span>🎯 {p.objetivo}</span>}
            {p.user_id
              ? <span className="flex items-center gap-1 text-sage-700"><Smartphone size={14} />usa o app</span>
              : p.email && <span className="flex items-center gap-1" title="Ainda não entrou no app com este e-mail"><Mail size={14} />convite: {p.email}</span>}
            {proxima && <span className="flex items-center gap-1"><CalendarDays size={14} />próxima: {fmt(proxima.inicio, "dd/MM 'às' HH:mm")}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setAgendar(null)}><CalendarPlus size={16} />Agendar</button>
          <button className="btn-outline" onClick={() => setEditar(true)}><Pencil size={15} />Editar</button>
        </div>
      </div>

      <div className="no-print mb-5 flex gap-1 overflow-x-auto border-b border-stone-200">
        {ABAS.map(({ id: a, label, icon: I }) => (
          <button key={a} onClick={() => setAba(a)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${aba === a ? 'border-sage-600 text-sage-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
            <I size={15} />{label}
          </button>
        ))}
      </div>

      {(aba === 'habitos' || aba === 'resumo') && (
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <MesPicker mes={mes} onChange={setMes} />
          {aba === 'habitos' && <button className="btn-primary" onClick={() => setHabitoModal({ h: null })}><Plus size={16} />Adicionar hábito</button>}
        </div>
      )}

      {aba === 'habitos' && (carregando ? <Spinner /> : habitos.length === 0 ? (
        <div className="card">
          <Vazio icone={<ListChecks />} titulo="Nenhum hábito neste mês"
            texto="Adicione os hábitos que o paciente vai acompanhar — como Dieta, Academia e Água (+3 litros)."
            acao={<button className="btn-primary" onClick={() => setHabitoModal({ h: null })}><Plus size={16} />Adicionar hábito</button>} />
        </div>
      ) : (
        <div className="space-y-3">
          <GradeHabitos mes={mes} habitos={habitos} registros={registros} onAlternar={alternar} onEditarHabito={(h) => setHabitoModal({ h })} />
          <Legenda />
          {!p.user_id && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {p.email
                ? <>O paciente ainda não entrou no app. Peça para ele acessar este site e entrar com a conta Google <b>{p.email}</b> — os hábitos aparecem para ele marcar.</>
                : <>Cadastre o e-mail Google do paciente (em <b>Editar</b>) para ele marcar os hábitos pelo celular. Enquanto isso, você pode marcar por aqui.</>}
            </p>
          )}
        </div>
      ))}

      {aba === 'resumo' && (carregando ? <Spinner /> : (
        <ResumoMes paciente={p} mes={mes} habitos={habitos} registros={registros} editavel
          nomeProfissional={profissional ? `${profissional.nome}${profissional.crn ? ` · CRN ${profissional.crn}` : ''}` : undefined} />
      ))}

      {aba === 'consultas' && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Histórico de consultas</h2>
            <button className="btn-primary" onClick={() => setAgendar(null)}><CalendarPlus size={16} />Agendar</button>
          </div>
          {consultas.length === 0 ? <Vazio icone={<CalendarDays />} titulo="Nenhuma consulta registrada" /> : (
            <ul className="space-y-2">{consultas.map((c) => <ItemAgenda key={c.id} c={c} mostrarData onClick={() => setAgendar(c)} />)}</ul>
          )}
        </div>
      )}

      {aba === 'dados' && (
        <div className="card p-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Dado l="E-mail Google" v={p.email} icon={<Mail size={14} />} />
            <Dado l="Telefone" v={p.telefone} icon={<Phone size={14} />} />
            <Dado l="Nascimento" v={p.data_nascimento && `${fmt(p.data_nascimento, 'dd/MM/yyyy')} (${anos} anos)`} />
            <Dado l="Altura" v={p.altura_cm && `${p.altura_cm} cm`} />
            <Dado l="Peso inicial" v={p.peso_inicial && `${p.peso_inicial.toLocaleString('pt-BR')} kg`} />
            <Dado l="Em acompanhamento desde" v={fmt(p.created_at, 'dd/MM/yyyy')} />
            <Dado l="Objetivo" v={p.objetivo} className="sm:col-span-2" />
            <Dado l="Anotações" v={p.observacoes} className="sm:col-span-2" />
          </dl>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
            <button className="btn-outline" onClick={() => setEditar(true)}><Pencil size={15} />Editar dados</button>
            <button className="btn-ghost" onClick={arquivar}>{p.ativo ? <><Archive size={15} />Arquivar</> : <><ArchiveRestore size={15} />Reativar</>}</button>
            <button className="btn-danger" onClick={excluir}><Trash2 size={15} />Excluir</button>
          </div>
        </div>
      )}

      <HabitoModal aberto={!!habitoModal} onFechar={() => setHabitoModal(null)} pacienteId={p.id} habito={habitoModal?.h ?? null}
        proximaOrdem={habitos.length} onSalvo={carregar} />
      <PacienteModal aberto={editar} onFechar={() => setEditar(false)} paciente={p} onSalvo={setP} />
      <CompromissoModal aberto={agendar !== undefined} onFechar={() => setAgendar(undefined)} compromisso={agendar ?? null} pacienteFixo={p.id} onSalvo={carregarConsultas} />
    </>
  )
}

function Dado({ l, v, icon, className = '' }: { l: string; v: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="label">{l}</dt>
      <dd className="flex items-center gap-1.5 whitespace-pre-wrap">{icon && v ? <span className="text-stone-400">{icon}</span> : null}{v || <span className="text-stone-400">—</span>}</dd>
    </div>
  )
}
