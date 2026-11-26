import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Users, Smartphone, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { idade } from '../../lib/datas'
import { corPct } from '../../lib/habitos'
import type { Paciente } from '../../lib/types'
import { Avatar, Spinner, Vazio, toastErro } from '../../components/ui'
import { Cabecalho } from '../../components/Layout'
import { PacienteModal } from '../../components/PacienteModal'

export default function Pacientes() {
  const nav = useNavigate()
  const [lista, setLista] = useState<Paciente[] | null>(null)
  const [adesao, setAdesao] = useState<Record<string, number | null>>({})
  const [busca, setBusca] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [novo, setNovo] = useState(false)

  useEffect(() => {
    Promise.all([api<Paciente[]>('/pacientes'), api<Record<string, number | null>>('/pacientes/adesao')])
      .then(([l, a]) => { setLista(l); setAdesao(a) })
      .catch((e) => { toastErro(e); setLista([]) })
  }, [])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (lista ?? []).filter((p) => (mostrarInativos || p.ativo) && (!q || p.nome.toLowerCase().includes(q) || p.email?.includes(q)))
  }, [lista, busca, mostrarInativos])

  return (
    <>
      <Cabecalho titulo="Pacientes" sub={lista ? `${lista.filter((p) => p.ativo).length} em acompanhamento` : undefined}
        acoes={<button className="btn-primary" onClick={() => setNovo(true)}><Plus size={16} />Novo paciente</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input !pl-9" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} className="accent-sage-600" />Mostrar arquivados
        </label>
      </div>

      <div className="card overflow-hidden">
        {!lista ? <Spinner /> : filtrados.length === 0 ? (
          <Vazio icone={<Users />} titulo={lista.length ? 'Nenhum paciente encontrado' : 'Nenhum paciente ainda'}
            texto="Cadastre o paciente com o e-mail Google dele para que ele possa marcar os hábitos pelo celular."
            acao={!lista.length && <button className="btn-primary" onClick={() => setNovo(true)}><Plus size={16} />Cadastrar primeiro paciente</button>} />
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtrados.map((p) => {
              const a = adesao[p.id]
              const anos = idade(p.data_nascimento)
              return (
                <li key={p.id}>
                  <Link to={`/pacientes/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50">
                    <Avatar nome={p.nome} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.nome}</span>
                        {!p.ativo && <span className="chip bg-stone-100 text-stone-500">arquivado</span>}
                        {p.user_id && <span className="chip bg-sage-50 text-sage-700" title="O paciente já entrou no app"><Smartphone size={11} />no app</span>}
                      </div>
                      <div className="truncate text-xs text-stone-500">
                        {[anos != null && `${anos} anos`, p.objetivo].filter(Boolean).join(' · ') || p.email || '—'}
                      </div>
                    </div>
                    {p.ativo && (
                      <div className="text-right">
                        <div className={`text-sm font-semibold tabular-nums ${corPct(a ?? null)}`}>{a == null ? '—' : `${a}%`}</div>
                        <div className="text-[11px] text-stone-400">adesão no mês</div>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-stone-300" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <PacienteModal aberto={novo} onFechar={() => setNovo(false)} paciente={null} onSalvo={(p) => nav(`/pacientes/${p.id}`)} />
    </>
  )
}
