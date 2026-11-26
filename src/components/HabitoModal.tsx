import { useEffect, useState } from 'react'
import { Trash2, Archive } from 'lucide-react'
import { api, tentar } from '../lib/api'
import { hoje } from '../lib/datas'
import type { Habito } from '../lib/types'
import { Campo, Modal, toast, toastErro, txt } from './ui'

const CORES = ['#6b8f71', '#3b82a6', '#c08a3e', '#8b6bb8', '#c0504d', '#2f9e8f', '#d97757', '#78716c']
const SUGESTOES = [
  ['Dieta', ''], ['Academia', ''], ['Água', '+3 litros'], ['Dormir bem', '7–8 horas'],
  ['Frutas', '3 porções'], ['Sem doces', ''], ['Caminhada', '30 min'], ['Suplementação', ''],
]

type Props = {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  habito: Habito | null // null = novo
  proximaOrdem: number
  onSalvo: () => void
}

export function HabitoModal({ aberto, onFechar, pacienteId, habito, proximaOrdem, onSalvo }: Props) {
  const [nome, setNome] = useState('')
  const [meta, setMeta] = useState('')
  const [cor, setCor] = useState(CORES[0]!)
  const [inicio, setInicio] = useState(hoje())
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setNome(habito?.nome ?? '')
    setMeta(habito?.meta ?? '')
    setCor(habito?.cor ?? CORES[proximaOrdem % CORES.length]!)
    setInicio(habito?.inicio ?? hoje().slice(0, 8) + '01')
  }, [aberto, habito, proximaOrdem])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    const dados = { nome: nome.trim(), meta: txt(meta), cor, inicio }
    const { error } = await tentar(habito
      ? api(`/habitos/${habito.id}`, { method: 'PUT', body: { ...dados, fim: habito.fim } })
      : api(`/pacientes/${pacienteId}/habitos`, { method: 'POST', body: dados }))
    setSalvando(false)
    if (error) return toastErro(error)
    toast(habito ? 'Hábito atualizado' : 'Hábito adicionado')
    onSalvo(); onFechar()
  }

  async function encerrar() {
    if (!habito || !confirm(`Encerrar "${habito.nome}" a partir de hoje? O histórico fica guardado.`)) return
    const { error } = await tentar(api(`/habitos/${habito.id}`, { method: 'PUT', body: { ...habito, fim: hoje() } }))
    if (error) return toastErro(error)
    toast('Hábito encerrado'); onSalvo(); onFechar()
  }

  async function excluir() {
    if (!habito || !confirm(`Excluir "${habito.nome}" e TODAS as marcações dele? Isso não pode ser desfeito.`)) return
    const { error } = await tentar(api(`/habitos/${habito.id}`, { method: 'DELETE' }))
    if (error) return toastErro(error)
    toast('Hábito excluído'); onSalvo(); onFechar()
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={habito ? 'Editar hábito' : 'Novo hábito'}>
      <form onSubmit={salvar} className="space-y-4">
        {!habito && (
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES.map(([n, m]) => (
              <button type="button" key={n} className="chip cursor-pointer bg-sage-50 text-sage-700 hover:bg-sage-100" onClick={() => { setNome(n!); setMeta(m!) }}>{n}</button>
            ))}
          </div>
        )}
        <Campo label="Hábito">
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Água" autoFocus required maxLength={80} />
        </Campo>
        <Campo label="Meta / detalhe (opcional)">
          <input className="input" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ex.: +3 litros" maxLength={80} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Começa em">
            <input type="date" className="input" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
          </Campo>
          <div>
            <span className="label">Cor</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CORES.map((c) => (
                <button type="button" key={c} onClick={() => setCor(c)} aria-label={`Cor ${c}`}
                  className={`h-6 w-6 rounded-full ring-offset-2 ${cor === c ? 'ring-2 ring-stone-500' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        {habito?.fim && <p className="text-xs text-stone-500">Encerrado em {habito.fim.split('-').reverse().join('/')}.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex gap-1">
            {habito && !habito.fim && <button type="button" className="btn-ghost" onClick={encerrar}><Archive size={15} />Encerrar</button>}
            {habito && <button type="button" className="btn-danger" onClick={excluir}><Trash2 size={15} />Excluir</button>}
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
