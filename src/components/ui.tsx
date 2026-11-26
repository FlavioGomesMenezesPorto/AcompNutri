import { useEffect, useState, type ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'
import { iniciais } from '../lib/datas'

/* ---------- toast ---------- */
type T = { id: number; msg: string; erro?: boolean }
let push: (t: T) => void = () => {}
export function toast(msg: string, erro = false) { push({ id: Date.now() + Math.random(), msg, erro }) }
export function toastErro(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e)
  console.error(e); toast('Erro: ' + m, true)
}
export function ToastHost() {
  const [itens, setItens] = useState<T[]>([])
  useEffect(() => {
    push = (t) => {
      setItens((l) => [...l, t])
      setTimeout(() => setItens((l) => l.filter((x) => x.id !== t.id)), 3500)
    }
  }, [])
  return (
    <div className="no-print fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
      {itens.map((t) => (
        <div key={t.id} className={`rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${t.erro ? 'bg-nao' : 'bg-stone-800'}`}>{t.msg}</div>
      ))}
    </div>
  )
}

/* ---------- modal ---------- */
// pilha de modais abertos: o botão "voltar" do Android fecha o do topo
const pilhaModais: (() => void)[] = []
export function fecharModalDoTopo() {
  const f = pilhaModais[pilhaModais.length - 1]
  if (!f) return false
  f(); return true
}

export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-lg' }: {
  aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode; largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    const fechar = () => onFechar()
    window.addEventListener('keydown', f)
    pilhaModais.push(fechar)
    return () => {
      window.removeEventListener('keydown', f)
      const i = pilhaModais.lastIndexOf(fechar)
      if (i >= 0) pilhaModais.splice(i, 1)
    }
  }, [aberto, onFechar])
  if (!aberto) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={onFechar}>
      <div className={`card max-h-[92vh] w-full ${largura} overflow-y-auto rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button className="btn-ghost !p-1.5" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ texto = 'Carregando…' }: { texto?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500"><Loader2 className="animate-spin" size={18} />{texto}</div>
}

export function Avatar({ nome, url, size = 36 }: { nome: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-sage-100 font-semibold text-sage-700" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {iniciais(nome)}
    </div>
  )
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-sage-100 p-3 text-sage-600">{icone}</div>
      <p className="font-medium">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-stone-500">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>
}

export const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z"/></svg>
)

/** número vazio ↔ null */
export const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
export const txt = (v: string) => (v.trim() === '' ? null : v.trim())
