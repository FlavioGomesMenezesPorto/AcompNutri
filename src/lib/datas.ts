import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
export const mesKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd')
export const diasDoMes = (d: Date) => eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) })
export const fmt = (d: Date | string, p: string) => format(typeof d === 'string' ? parseISO(d) : d, p, { locale: ptBR })
export const nomeMes = (d: Date) => {
  const s = fmt(d, "MMMM 'de' yyyy")
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const idade = (nasc: string | null) => (nasc ? differenceInYears(new Date(), parseISO(nasc)) : null)
export const hoje = () => ymd(new Date())

/** Hábito está ativo nesse dia? */
export const habitoAtivoEm = (h: { inicio: string; fim: string | null }, dia: string) =>
  dia >= h.inicio && (!h.fim || dia <= h.fim)

export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
