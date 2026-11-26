import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CheckSquare, FileText, Leaf, Check, X, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { configurado } from '../lib/supabase'
import { GoogleIcon } from '../components/ui'

const SLIDES = [
  {
    icone: CheckSquare,
    titulo: 'Sua folha de hábitos, no bolso',
    texto: 'Marque ✓ Consegui ou ✗ Não consegui em cada hábito do dia — dieta, treino, água e o que mais o seu nutricionista definir.',
  },
  {
    icone: FileText,
    titulo: 'Resumo completo do mês',
    texto: 'Adesão por hábito e por semana, sequências, peso e medidas, e a avaliação do profissional pronta para imprimir.',
  },
  {
    icone: CalendarDays,
    titulo: 'Agenda de consultas',
    texto: 'Consultas, retornos e lembretes organizados — com aviso pelo WhatsApp em um toque.',
  },
]

/** Pequena prévia ilustrativa da folha de hábitos (só visual). */
function MiniFolha({ claro = false }: { claro?: boolean }) {
  const linhas = [
    { nome: 'Dieta', marcas: 'oooxooo' },
    { nome: 'Academia', marcas: 'oxoo-oo' },
    { nome: 'Água +3L', marcas: 'ooooxoo' },
  ]
  return (
    <div className={`rounded-2xl p-3 shadow-xl ${claro ? 'bg-white/95' : 'bg-white'}`} aria-hidden="true">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-sage-800">Controle de Hábitos</span>
        <span className="text-[10px] text-stone-400">esta semana</span>
      </div>
      <div className="space-y-1.5">
        {linhas.map((l) => (
          <div key={l.nome} className="flex items-center gap-1.5">
            <span className="w-16 truncate text-[11px] font-medium text-stone-600">{l.nome}</span>
            {l.marcas.split('').map((m, i) => (
              <span key={i} className={`flex h-5 w-5 items-center justify-center rounded-md ${m === 'o' ? 'bg-ok text-white' : m === 'x' ? 'bg-nao text-white' : 'border border-stone-200'}`}>
                {m === 'o' && <Check size={12} strokeWidth={3} />}
                {m === 'x' && <X size={12} strokeWidth={3} />}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function BotaoGoogle({ grande = false }: { grande?: boolean }) {
  const { entrar } = useAuth()
  const [indo, setIndo] = useState(false)
  if (!configurado) {
    return (
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Supabase não configurado. Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_KEY</code> no <code>.env.local</code>.
      </div>
    )
  }
  return (
    <button
      className={`btn w-full border border-stone-300 bg-white text-stone-800 shadow-sm hover:bg-stone-50 ${grande ? '!py-3.5 !text-base' : '!py-3'}`}
      disabled={indo}
      onClick={async () => { setIndo(true); await entrar(); setTimeout(() => setIndo(false), 4000) }}
    >
      {indo ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
      {indo ? 'Abrindo o Google…' : 'Entrar com Google'}
    </button>
  )
}

function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-xl p-2 ${claro ? 'bg-white/15 text-white' : 'bg-sage-600 text-white'}`}><Leaf size={18} /></div>
      <span className={`text-lg font-semibold tracking-tight ${claro ? 'text-white' : ''}`}>
        Acomp<span className={claro ? 'text-sage-200' : 'text-sage-600'}>Nutri</span>
      </span>
    </div>
  )
}

export default function Login() {
  return (
    <>
      <LoginCelular />
      <LoginComputador />
    </>
  )
}

/* ---------- celular / app: apresentação deslizante + botão fixo ---------- */
function LoginCelular() {
  const [atual, setAtual] = useState(0)
  const trilho = useRef<HTMLDivElement>(null)

  const irPara = (i: number) => trilho.current?.scrollTo({ left: i * trilho.current.clientWidth, behavior: 'smooth' })

  return (
    <div className="flex min-h-[100dvh] flex-col bg-sage-600 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-10 top-40 h-32 w-32 rounded-full bg-white/5" />
        <div className="px-6 pt-6"><Marca claro /></div>
        <div className="flex flex-1 items-center justify-center px-8 py-6">
          <div className="w-full max-w-xs rotate-[-3deg]"><MiniFolha claro /></div>
        </div>
      </div>

      <div className="rounded-t-[28px] bg-white px-6 pt-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        <div
          ref={trilho}
          onScroll={(e) => setAtual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="-mx-6 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SLIDES.map(({ icone: I, titulo, texto }) => (
            <div key={titulo} className="w-full shrink-0 snap-center px-6">
              <div className="mb-3 inline-flex rounded-xl bg-sage-100 p-2.5 text-sage-700"><I size={20} /></div>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">{titulo}</h1>
              <p className="mt-2 min-h-[4.5rem] text-[15px] leading-relaxed text-stone-500">{texto}</p>
            </div>
          ))}
        </div>

        <div className="my-5 flex justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.titulo} onClick={() => irPara(i)} aria-label={`Ir para ${i + 1}`}
              className={`h-2 rounded-full transition-all ${atual === i ? 'w-6 bg-sage-600' : 'w-2 bg-stone-300'}`} />
          ))}
        </div>

        <BotaoGoogle grande />
        <p className="mt-4 text-center text-xs leading-relaxed text-stone-500">
          <b>Paciente?</b> Entre com o e-mail Google que você informou ao seu nutricionista.
        </p>
      </div>
    </div>
  )
}

/* ---------- computador: tela dividida ---------- */
function LoginComputador() {
  return (
    <div className="hidden min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex flex-col overflow-hidden bg-gradient-to-br from-sage-600 via-sage-700 to-sage-900 p-12 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />
        <Marca claro />
        <div className="relative my-auto max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Acompanhamento nutricional que vai além da consulta.</h1>
          <p className="mt-4 text-lg text-sage-100">A folha de controle de hábitos, agora digital: o paciente marca no celular e você acompanha tudo em tempo real.</p>
          <div className="mt-10 grid grid-cols-[1fr_auto] items-center gap-8">
            <ul className="space-y-4">
              {SLIDES.map(({ icone: I, titulo }) => (
                <li key={titulo} className="flex items-center gap-3">
                  <span className="rounded-lg bg-white/15 p-2"><I size={18} /></span>
                  <span className="font-medium">{titulo}</span>
                </li>
              ))}
            </ul>
            <div className="w-64 rotate-[-4deg]"><MiniFolha claro /></div>
          </div>
        </div>
        <p className="relative font-script text-2xl text-sage-100">Pequenas ações constroem grandes transformações</p>
      </section>

      <section className="flex items-center justify-center bg-[#f6f7f4] p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">Bem-vindo(a)</h2>
          <p className="mt-2 text-stone-500">Entre com sua conta Google para continuar.</p>

          <div className="mt-8"><BotaoGoogle /></div>

          <div className="mt-8 space-y-3">
            <div className="card flex gap-3 p-4">
              <span className="h-fit rounded-lg bg-sage-100 p-2 text-sage-700"><CheckSquare size={18} /></span>
              <div className="text-sm">
                <div className="font-medium">Nutricionista</div>
                <div className="text-stone-500">No primeiro acesso, você cria seu consultório e cadastra os pacientes.</div>
              </div>
            </div>
            <div className="card flex gap-3 p-4">
              <span className="h-fit rounded-lg bg-sage-100 p-2 text-sage-700"><CalendarDays size={18} /></span>
              <div className="text-sm">
                <div className="font-medium">Paciente / aluno</div>
                <div className="text-stone-500">Use o e-mail Google que você passou ao seu nutricionista. Também tem app para Android.</div>
              </div>
            </div>
          </div>

          <p className="mt-8 flex items-center gap-1.5 text-xs text-stone-400"><ShieldCheck size={14} />Seus dados ficam visíveis só para você e seu nutricionista.</p>
        </div>
      </section>
    </div>
  )
}

/** Quando o login deu certo mas a API não respondeu. */
export function TelaErro() {
  const { erro, recarregar, sair } = useAuth()
  const [tentando, setTentando] = useState(false)
  return (
    <div className="safe-top flex min-h-[100dvh] items-center justify-center bg-sage-50 p-6">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-3 w-fit rounded-full bg-amber-100 p-3 text-amber-700"><Leaf size={22} /></div>
        <h1 className="text-lg font-semibold">Não foi possível conectar</h1>
        <p className="mt-1 text-sm text-stone-500">{erro || 'O servidor não respondeu.'}</p>
        <button className="btn-primary mt-5 w-full" disabled={tentando}
          onClick={async () => { setTentando(true); await recarregar(); setTentando(false) }}>
          {tentando ? <Loader2 size={16} className="animate-spin" /> : null}Tentar de novo
        </button>
        <button className="btn-ghost mt-2 w-full" onClick={sair}>Sair</button>
      </div>
    </div>
  )
}

/** Tela de carregamento com a marca (igual ao splash do app, sem "piscar" ao abrir). */
export function TelaCarregando() {
  // no plano grátis do Render a API "dorme"; a primeira chamada pode levar ~1 minuto
  const [demorando, setDemorando] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDemorando(true), 4000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-sage-600 px-6 text-center text-white">
      <div className="animate-pulse rounded-2xl bg-white/15 p-4"><Leaf size={36} /></div>
      <span className="text-xl font-semibold tracking-tight">Acomp<span className="text-sage-200">Nutri</span></span>
      <p className={`max-w-xs text-sm text-sage-100 transition-opacity duration-500 ${demorando ? 'opacity-100' : 'opacity-0'}`}>
        Conectando ao servidor… na primeira vez do dia isso pode levar até 1 minuto.
      </p>
    </div>
  )
}
