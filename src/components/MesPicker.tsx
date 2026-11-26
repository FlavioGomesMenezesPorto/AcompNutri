import { addMonths, subMonths, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nomeMes } from '../lib/datas'

export function MesPicker({ mes, onChange }: { mes: Date; onChange: (d: Date) => void }) {
  const atual = isSameMonth(mes, new Date())
  return (
    <div className="no-print flex items-center gap-1">
      <button className="btn-outline !px-2" onClick={() => onChange(subMonths(mes, 1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
      <span className="min-w-[150px] text-center text-sm font-semibold">{nomeMes(mes)}</span>
      <button className="btn-outline !px-2" onClick={() => onChange(addMonths(mes, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button>
      {!atual && <button className="btn-ghost text-xs" onClick={() => onChange(new Date())}>Hoje</button>}
    </div>
  )
}
