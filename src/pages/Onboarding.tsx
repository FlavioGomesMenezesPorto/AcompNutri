import { useState } from 'react'
import { Stethoscope, User, LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { api, tentar } from '../lib/api'
import { Campo, toastErro, txt } from '../components/ui'
import { Marca } from '../components/Layout'

export default function Onboarding() {
  const { user, recarregar, sair } = useAuth()
  const [escolha, setEscolha] = useState<'prof' | 'paciente' | null>(null)
  const [nome, setNome] = useState((user?.user_metadata?.full_name as string) ?? '')
  const [crn, setCrn] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const { error } = await tentar(api('/me/profissional', {
      method: 'POST', body: { nome: nome.trim(), crn: txt(crn), telefone: txt(telefone) },
    }))
    setSalvando(false)
    if (error) return toastErro(error)
    await recarregar()
  }

  return (
    <div className="safe-top flex min-h-[100dvh] items-center justify-center bg-sage-50 p-4">
      <div className="card w-full max-w-lg p-7">
        <div className="flex items-center justify-between">
          <Marca />
          <button className="btn-ghost text-xs" onClick={sair}><LogOut size={14} />Sair</button>
        </div>
        <h1 className="mt-6 text-xl font-semibold">Olá{nome ? `, ${nome.split(' ')[0]}` : ''}! Como você vai usar o AcompNutri?</h1>
        <p className="mt-1 text-sm text-stone-500">Conectado como {user?.email}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button onClick={() => setEscolha('prof')} className={`rounded-xl border p-4 text-left transition ${escolha === 'prof' ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-200' : 'border-stone-200 hover:border-stone-300'}`}>
            <Stethoscope className="text-sage-600" />
            <div className="mt-2 font-medium">Sou nutricionista</div>
            <div className="text-xs text-stone-500">Cadastrar pacientes, hábitos e agenda</div>
          </button>
          <button onClick={() => setEscolha('paciente')} className={`rounded-xl border p-4 text-left transition ${escolha === 'paciente' ? 'border-sage-500 bg-sage-50 ring-2 ring-sage-200' : 'border-stone-200 hover:border-stone-300'}`}>
            <User className="text-sage-600" />
            <div className="mt-2 font-medium">Sou paciente / aluno</div>
            <div className="text-xs text-stone-500">Marcar meus hábitos do dia</div>
          </button>
        </div>

        {escolha === 'prof' && (
          <form onSubmit={cadastrar} className="mt-6 space-y-3 border-t border-stone-200 pt-5">
            <Campo label="Nome completo"><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="CRN (opcional)"><input className="input" value={crn} onChange={(e) => setCrn(e.target.value)} placeholder="CRN-9 12345" /></Campo>
              <Campo label="Telefone (opcional)"><input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(31) 9…" /></Campo>
            </div>
            <button className="btn-primary w-full" disabled={salvando}>{salvando ? 'Criando…' : 'Criar meu consultório'}</button>
          </form>
        )}

        {escolha === 'paciente' && (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Ainda não encontramos seu cadastro.</p>
            <p className="mt-1">Peça para seu nutricionista cadastrar você com o e-mail <b>{user?.email}</b>. Depois, é só voltar aqui.</p>
            <button className="btn-outline mt-3" onClick={recarregar}>Já fui cadastrado — verificar</button>
          </div>
        )}
      </div>
    </div>
  )
}
