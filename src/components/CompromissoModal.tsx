import { useEffect, useState } from 'react'
import { Trash2, MessageCircle } from 'lucide-react'
import { addMinutes, differenceInMinutes, format, parseISO } from 'date-fns'
import { api, tentar } from '../lib/api'
import { TIPOS, STATUS, type Compromisso, type Paciente, type StatusCompromisso, type TipoCompromisso } from '../lib/types'
import { fmt } from '../lib/datas'
import { Campo, Modal, toast, toastErro, txt } from './ui'

type Props = {
  aberto: boolean
  onFechar: () => void
  compromisso: Compromisso | null
  dataInicial?: string // yyyy-MM-dd
  pacienteFixo?: string
  onSalvo: () => void
}

const DURACOES = [15, 30, 45, 60, 90, 120]

export function CompromissoModal({ aberto, onFechar, compromisso, dataInicial, pacienteFixo, onSalvo }: Props) {
  const [pacientes, setPacientes] = useState<Pick<Paciente, 'id' | 'nome' | 'telefone'>[]>([])
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoCompromisso>('consulta')
  const [pacienteId, setPacienteId] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('09:00')
  const [duracao, setDuracao] = useState(60)
  const [local, setLocal] = useState('')
  const [notas, setNotas] = useState('')
  const [status, setStatus] = useState<StatusCompromisso>('agendado')
  const [tituloEditado, setTituloEditado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    api<Paciente[]>('/pacientes', { query: { ativos: 1 } }).then(setPacientes).catch(toastErro)
    const c = compromisso
    setTitulo(c?.titulo ?? '')
    setTituloEditado(!!c)
    setTipo(c?.tipo ?? 'consulta')
    setPacienteId(c?.paciente_id ?? pacienteFixo ?? '')
    setData(c ? format(parseISO(c.inicio), 'yyyy-MM-dd') : dataInicial ?? format(new Date(), 'yyyy-MM-dd'))
    setHora(c ? format(parseISO(c.inicio), 'HH:mm') : '09:00')
    setDuracao(c?.fim ? differenceInMinutes(parseISO(c.fim), parseISO(c.inicio)) : 60)
    setLocal(c?.local ?? '')
    setNotas(c?.notas ?? '')
    setStatus(c?.status ?? 'agendado')
  }, [aberto, compromisso, dataInicial, pacienteFixo])

  // título automático: "Consulta — Fulana"
  useEffect(() => {
    if (tituloEditado) return
    const p = pacientes.find((x) => x.id === pacienteId)
    setTitulo(p ? `${TIPOS[tipo].label} — ${p.nome.split(' ')[0]}` : TIPOS[tipo].label)
  }, [tipo, pacienteId, pacientes, tituloEditado])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const inicio = new Date(`${data}T${hora}:00`)
    const dados = {
      titulo: titulo.trim(), tipo, paciente_id: pacienteId || null,
      inicio: inicio.toISOString(), fim: addMinutes(inicio, duracao).toISOString(),
      local: txt(local), notas: txt(notas), status,
    }
    const { error } = await tentar(compromisso
      ? api(`/compromissos/${compromisso.id}`, { method: 'PUT', body: dados })
      : api('/compromissos', { method: 'POST', body: dados }))
    setSalvando(false)
    if (error) return toastErro(error)
    toast(compromisso ? 'Compromisso atualizado' : 'Compromisso agendado')
    onSalvo(); onFechar()
  }

  async function excluir() {
    if (!compromisso || !confirm('Excluir este compromisso?')) return
    const { error } = await tentar(api(`/compromissos/${compromisso.id}`, { method: 'DELETE' }))
    if (error) return toastErro(error)
    toast('Compromisso excluído'); onSalvo(); onFechar()
  }

  const pac = pacientes.find((x) => x.id === pacienteId)
  const whats = pac?.telefone?.replace(/\D/g, '')
  const linkWhats = whats && data
    ? `https://wa.me/${whats.length <= 11 ? '55' + whats : whats}?text=${encodeURIComponent(`Olá, ${pac!.nome.split(' ')[0]}! Lembrando da sua ${TIPOS[tipo].label.toLowerCase()} em ${fmt(data, "dd/MM (EEEE)")} às ${hora}.${local ? ` Local: ${local}.` : ''}`)}`
    : null

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={compromisso ? 'Editar compromisso' : 'Novo compromisso'} largura="max-w-xl">
      <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap gap-1.5 sm:col-span-2">
          {(Object.keys(TIPOS) as TipoCompromisso[]).map((t) => (
            <button type="button" key={t} onClick={() => setTipo(t)}
              className={`chip cursor-pointer border px-2.5 py-1 ${tipo === t ? 'border-transparent text-white' : 'border-stone-200 bg-white text-stone-600'}`}
              style={tipo === t ? { background: TIPOS[t].cor } : undefined}>{TIPOS[t].label}</button>
          ))}
        </div>
        <Campo label="Paciente" className="sm:col-span-2">
          <select className="input" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} disabled={!!pacienteFixo}>
            <option value="">— sem paciente (compromisso pessoal) —</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Título" className="sm:col-span-2">
          <input className="input" value={titulo} onChange={(e) => { setTitulo(e.target.value); setTituloEditado(true) }} required maxLength={120} />
        </Campo>
        <Campo label="Data"><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} required /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Hora"><input type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} required /></Campo>
          <Campo label="Duração">
            <select className="input" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
              {[...new Set([...DURACOES, duracao])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? d % 60 : ''}`}</option>)}
            </select>
          </Campo>
        </div>
        <Campo label="Local / link" className="sm:col-span-2"><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Consultório, Google Meet…" /></Campo>
        <Campo label="Anotações" className="sm:col-span-2"><textarea rows={2} className="input" value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        {compromisso && (
          <Campo label="Situação" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS) as StatusCompromisso[]).map((s) => (
                <button type="button" key={s} onClick={() => setStatus(s)}
                  className={`chip cursor-pointer border px-2.5 py-1 ${status === s ? 'border-sage-600 bg-sage-600 text-white' : 'border-stone-200 bg-white text-stone-600'}`}>{STATUS[s]}</button>
              ))}
            </div>
          </Campo>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 sm:col-span-2">
          <div className="flex gap-1">
            {compromisso && <button type="button" className="btn-danger" onClick={excluir}><Trash2 size={15} />Excluir</button>}
            {linkWhats && <a className="btn-ghost text-[#25a244]" href={linkWhats} target="_blank" rel="noreferrer"><MessageCircle size={15} />Lembrete WhatsApp</a>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
            <button className="btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
