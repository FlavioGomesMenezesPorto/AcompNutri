import { Check, X, Pencil } from 'lucide-react'
import { getDay, isToday } from 'date-fns'
import { diasDoMes, habitoAtivoEm, hoje, ymd } from '../lib/datas'
import { corPct } from '../lib/habitos'
import type { Habito, StatusRegistro } from '../lib/types'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Props = {
  mes: Date
  habitos: Habito[]
  registros: Record<string, StatusRegistro>
  onAlternar?: (habitoId: string, data: string) => void // ausente = somente leitura
  onEditarHabito?: (h: Habito) => void
}

/** A "folha" de controle: hábitos nas linhas, dias do mês nas colunas. */
export function GradeHabitos({ mes, habitos, registros, onAlternar, onEditarHabito }: Props) {
  const dias = diasDoMes(mes)
  const hj = hoje()

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-sage-600 text-white">
            <th className="sticky left-0 z-10 min-w-[170px] bg-sage-600 px-3 py-2 text-left font-semibold">Hábitos</th>
            {dias.map((d) => {
              const fds = getDay(d) === 0 || getDay(d) === 6
              return (
                <th key={d.getDate()} className={`w-8 min-w-8 px-0 py-1 text-center text-[11px] font-medium ${fds ? 'bg-sage-700' : ''} ${isToday(d) ? '!bg-amber-500' : ''}`}>
                  <div className="opacity-70">{SEMANA[getDay(d)]}</div>
                  <div>{d.getDate()}</div>
                </th>
              )
            })}
            <th className="min-w-14 px-2 text-center text-[11px] font-semibold">%</th>
          </tr>
        </thead>
        <tbody>
          {habitos.map((h) => {
            let ok = 0, total = 0
            const celulas = dias.map((d) => {
              const data = ymd(d)
              const ativo = habitoAtivoEm(h, data)
              const futuro = data > hj
              const s = registros[`${h.id}|${data}`]
              if (ativo && !futuro) { total++; if (s === 'ok') ok++ }
              const fds = getDay(d) === 0 || getDay(d) === 6
              const clicavel = !!onAlternar && ativo && !futuro
              return (
                <td key={data} className={`border-l border-stone-100 p-0 text-center ${fds ? 'bg-stone-50' : ''} ${!ativo ? 'bg-stone-100/70' : ''}`}>
                  <button
                    disabled={!clicavel}
                    onClick={() => clicavel && onAlternar!(h.id, data)}
                    title={`${h.nome} — ${d.toLocaleDateString('pt-BR')}${s === 'ok' ? ': consegui' : s === 'nao' ? ': não consegui' : ''}`}
                    className={`mx-auto flex h-8 w-8 items-center justify-center transition ${clicavel ? 'cursor-pointer hover:bg-sage-100' : 'cursor-default'} ${futuro && ativo ? 'opacity-40' : ''}`}
                  >
                    {s === 'ok' && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ok text-white"><Check size={15} strokeWidth={3} /></span>}
                    {s === 'nao' && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-nao text-white"><X size={15} strokeWidth={3} /></span>}
                  </button>
                </td>
              )
            })
            const pct = total ? Math.round((ok / total) * 100) : null
            return (
              <tr key={h.id} className="group border-t border-stone-200">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 align-middle">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.cor }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium leading-tight">{h.nome}</div>
                      {h.meta && <div className="truncate text-[11px] text-stone-500">{h.meta}</div>}
                    </div>
                    {onEditarHabito && (
                      <button className="no-print rounded p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" onClick={() => onEditarHabito(h)} aria-label={`Editar ${h.nome}`}>
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                </td>
                {celulas}
                <td className={`border-l border-stone-200 px-2 text-center text-xs font-semibold tabular-nums ${corPct(pct)}`}>
                  {pct == null ? '—' : `${pct}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Legenda({ editavel = true }: { editavel?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
      <span className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-ok text-white"><Check size={11} strokeWidth={3} /></span>Consegui</span>
      <span className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-nao text-white"><X size={11} strokeWidth={3} /></span>Não consegui</span>
      {editavel && <span className="no-print text-stone-400">Toque no quadradinho: vazio → ✓ → ✗ → vazio</span>}
    </div>
  )
}
