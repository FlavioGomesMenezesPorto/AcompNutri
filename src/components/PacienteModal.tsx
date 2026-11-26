import { useEffect, useState } from 'react'
import { api, tentar } from '../lib/api'
import type { Paciente } from '../lib/types'
import { Campo, Modal, num, toast, toastErro, txt } from './ui'

type Props = {
  aberto: boolean
  onFechar: () => void
  paciente: Paciente | null
  onSalvo: (p: Paciente) => void
}

const vazio = { nome: '', email: '', telefone: '', data_nascimento: '', altura_cm: '', peso_inicial: '', objetivo: '', observacoes: '' }

export function PacienteModal({ aberto, onFechar, paciente, onSalvo }: Props) {
  const [f, setF] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((v) => ({ ...v, [k]: e.target.value }))

  useEffect(() => {
    if (!aberto) return
    setF(paciente ? {
      nome: paciente.nome, email: paciente.email ?? '', telefone: paciente.telefone ?? '',
      data_nascimento: paciente.data_nascimento ?? '', altura_cm: paciente.altura_cm?.toString() ?? '',
      peso_inicial: paciente.peso_inicial?.toString() ?? '', objetivo: paciente.objetivo ?? '', observacoes: paciente.observacoes ?? '',
    } : vazio)
  }, [aberto, paciente])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const dados = {
      nome: f.nome.trim(), email: txt(f.email.toLowerCase()), telefone: txt(f.telefone),
      data_nascimento: f.data_nascimento || null, altura_cm: num(f.altura_cm), peso_inicial: num(f.peso_inicial),
      objetivo: txt(f.objetivo), observacoes: txt(f.observacoes),
    }
    const { data, error } = await tentar(paciente
      ? api<Paciente>(`/pacientes/${paciente.id}`, { method: 'PUT', body: dados })
      : api<Paciente>('/pacientes', { method: 'POST', body: dados }))
    setSalvando(false)
    if (error) return toastErro(error)
    toast(paciente ? 'Dados atualizados' : 'Paciente cadastrado')
    onSalvo(data as Paciente); onFechar()
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={paciente ? 'Editar paciente' : 'Novo paciente'} largura="max-w-xl">
      <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome completo" className="sm:col-span-2"><input className="input" value={f.nome} onChange={set('nome')} required minLength={2} autoFocus /></Campo>
        <Campo label="E-mail Google (para o paciente entrar no app)" className="sm:col-span-2">
          <input type="email" className="input" value={f.email} onChange={set('email')} placeholder="paciente@gmail.com" />
        </Campo>
        <Campo label="Telefone / WhatsApp"><input className="input" value={f.telefone} onChange={set('telefone')} /></Campo>
        <Campo label="Data de nascimento"><input type="date" className="input" value={f.data_nascimento} onChange={set('data_nascimento')} /></Campo>
        <Campo label="Altura (cm)"><input inputMode="decimal" className="input" value={f.altura_cm} onChange={set('altura_cm')} placeholder="168" /></Campo>
        <Campo label="Peso inicial (kg)"><input inputMode="decimal" className="input" value={f.peso_inicial} onChange={set('peso_inicial')} placeholder="72,5" /></Campo>
        <Campo label="Objetivo" className="sm:col-span-2"><input className="input" value={f.objetivo} onChange={set('objetivo')} placeholder="Ex.: emagrecimento, ganho de massa, reeducação alimentar" /></Campo>
        <Campo label="Anotações (só você vê)" className="sm:col-span-2"><textarea rows={3} className="input" value={f.observacoes} onChange={set('observacoes')} placeholder="Restrições, alergias, histórico…" /></Campo>
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={onFechar}>Cancelar</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  )
}
