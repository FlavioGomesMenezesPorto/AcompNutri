import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api, tentar } from '../../lib/api'
import { Avatar, Campo, toast, toastErro, txt } from '../../components/ui'
import { Cabecalho } from '../../components/Layout'

export default function Perfil() {
  const { profissional, user, recarregar, sair } = useAuth()
  const [nome, setNome] = useState(profissional?.nome ?? '')
  const [crn, setCrn] = useState(profissional?.crn ?? '')
  const [telefone, setTelefone] = useState(profissional?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const { error } = await tentar(api('/me/profissional', { method: 'PUT', body: { nome: nome.trim(), crn: txt(crn), telefone: txt(telefone) } }))
    setSalvando(false)
    if (error) return toastErro(error)
    toast('Perfil atualizado'); recarregar()
  }

  return (
    <>
      <Cabecalho titulo="Meu perfil" />
      <form onSubmit={salvar} className="card max-w-xl space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar nome={nome || '?'} url={user?.user_metadata?.avatar_url as string | undefined} size={52} />
          <div className="text-sm text-stone-500">Conta Google: <b className="text-stone-700">{user?.email}</b></div>
        </div>
        <Campo label="Nome (aparece no resumo impresso)"><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="CRN"><input className="input" value={crn} onChange={(e) => setCrn(e.target.value)} /></Campo>
          <Campo label="Telefone"><input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Campo>
        </div>
        <div className="flex justify-between">
          <button type="button" className="btn-ghost" onClick={sair}>Sair da conta</button>
          <button className="btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </>
  )
}
