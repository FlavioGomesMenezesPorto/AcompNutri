import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Users, CalendarDays, UserCog, LogOut, Leaf } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Avatar } from './ui'

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/perfil', label: 'Meu perfil', icon: UserCog },
]

export function Marca({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="rounded-lg bg-sage-600 p-1.5 text-white"><Leaf size={16} /></div>
      <span className="text-[15px] font-semibold tracking-tight">Acomp<span className="text-sage-600">Nutri</span></span>
    </div>
  )
}

export function LayoutProfissional({ children }: { children: ReactNode }) {
  const { profissional, user, sair } = useAuth()
  const foto = (user?.user_metadata?.avatar_url as string | undefined) ?? profissional?.avatar_url
  return (
    <div className="min-h-screen md:pl-60">
      {/* lateral (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-stone-200 bg-white px-3 py-5 md:flex">
        <Marca className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-sage-100 text-sage-800' : 'text-stone-600 hover:bg-stone-100'}`}>
              <I size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-xl border border-stone-200 p-2">
          <Avatar nome={profissional?.nome ?? '?'} url={foto} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profissional?.nome}</div>
            <div className="truncate text-xs text-stone-500">{profissional?.crn ? `CRN ${profissional.crn}` : 'Nutricionista'}</div>
          </div>
          <button className="btn-ghost !p-1.5" onClick={sair} title="Sair" aria-label="Sair"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* topo (celular) */}
      <header className="no-print safe-top sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
        <Marca />
        <button className="btn-ghost !p-1.5" onClick={sair} aria-label="Sair"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>

      {/* barra inferior (celular) */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white md:hidden">
        {NAV.map(({ to, label, icon: I, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-sage-700' : 'text-stone-500'}`}>
            <I size={20} />{label.replace('Meu ', '')}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Cabecalho({ titulo, sub, acoes }: { titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {sub && <p className="mt-0.5 text-sm text-stone-500">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
