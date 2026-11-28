import { useEffect, useMemo, useState } from 'react'
import { getISOWeek } from 'date-fns'
import { Printer, Save, Share2, Lock, Trophy, Flame, TrendingDown, TrendingUp, CalendarCheck, FileDown, Loader2 } from 'lucide-react'
import { api, tentar } from '../lib/api'
import { gerarRelatorioPdf } from '../lib/relatorio'
import { ehApp } from '../lib/nativo'
import { diasDoMes, fmt, habitoAtivoEm, hoje, mesKey, nomeMes, ymd } from '../lib/datas'
import { adesaoGeral, corPct, estatisticas } from '../lib/habitos'
import type { Compromisso, Habito, Paciente, ResumoMensal, StatusRegistro } from '../lib/types'
import { STATUS, TIPOS } from '../lib/types'
import { GradeHabitos, Legenda } from './GradeHabitos'
import { Campo, num, toast, toastErro, txt } from './ui'

type Props = {
  paciente: Paciente
  mes: Date
  habitos: Habito[]
  registros: Record<string, StatusRegistro>
  editavel: boolean // profissional = true; paciente = false (só lê se compartilhado)
  nomeProfissional?: string
}

const CAMPOS_TEXTO = [
  ['pontos_positivos', 'Pontos positivos do mês', 'O que funcionou bem, conquistas, evolução…'],
  ['a_melhorar', 'O que precisa melhorar', 'Dificuldades, gatilhos, dias mais difíceis…'],
  ['resumo', 'Resumo / análise do mês', 'Análise detalhada do acompanhamento, condutas, ajustes no plano alimentar…'],
  ['metas_proximo_mes', 'Metas para o próximo mês', 'Ex.: manter 3L de água, incluir 2 porções de fruta…'],
] as const

export function ResumoMes({ paciente, mes, habitos, registros, editavel, nomeProfissional }: Props) {
  const chave = mesKey(mes)
  const [resumo, setResumo] = useState<ResumoMensal | null>(null)
  const [anterior, setAnterior] = useState<{ peso: number | null } | null>(null)
  const [obs, setObs] = useState('')
  const [consultas, setConsultas] = useState<Compromisso[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [compartilhado, setCompartilhado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    let vivo = true
    setCarregado(false)
    type Resp = { resumo: ResumoMensal | null; peso_anterior: number | null; observacoes: string; consultas: Compromisso[] }
    api<Resp>(`/pacientes/${paciente.id}/resumo`, { query: { mes: chave } }).then((r) => {
      if (!vivo) return
      const d = r.resumo
      setResumo(d)
      setAnterior({ peso: r.peso_anterior })
      setObs(r.observacoes)
      setConsultas(r.consultas)
      setCompartilhado(d?.compartilhado ?? false)
      setForm({
        peso: d?.peso?.toString() ?? '', cintura_cm: d?.cintura_cm?.toString() ?? '', quadril_cm: d?.quadril_cm?.toString() ?? '',
        gordura_pct: d?.gordura_pct?.toString() ?? '', pontos_positivos: d?.pontos_positivos ?? '', a_melhorar: d?.a_melhorar ?? '',
        resumo: d?.resumo ?? '', metas_proximo_mes: d?.metas_proximo_mes ?? '',
      })
      setCarregado(true)
    }).catch((e) => { if (vivo) { toastErro(e); setCarregado(true) } })
    return () => { vivo = false }
  }, [paciente.id, chave])

  const est = useMemo(() => estatisticas(habitos, registros, mes), [habitos, registros, mes])
  const geral = adesaoGeral(est)
  const melhor = [...est].sort((a, b) => b.pct - a.pct)[0]
  const pior = [...est].sort((a, b) => a.pct - b.pct)[0]
  const maiorSeq = Math.max(0, ...est.map((e) => e.melhorSequencia))

  // adesão por semana do mês
  const semanas = useMemo(() => {
    const hj = hoje()
    const grupos = new Map<number, string[]>()
    for (const d of diasDoMes(mes)) {
      const w = getISOWeek(d)
      if (!grupos.has(w)) grupos.set(w, [])
      grupos.get(w)!.push(ymd(d))
    }
    return [...grupos.values()].map((dias, i) => {
      let ok = 0, tot = 0
      for (const h of habitos) for (const d of dias) {
        if (d > hj || !habitoAtivoEm(h, d)) continue
        tot++; if (registros[`${h.id}|${d}`] === 'ok') ok++
      }
      return { label: `Sem ${i + 1}`, faixa: `${dias[0]!.slice(8)}–${dias[dias.length - 1]!.slice(8)}`, pct: tot ? Math.round((ok / tot) * 100) : null }
    })
  }, [habitos, registros, mes])

  const peso = editavel ? num(form.peso ?? '') : resumo?.peso ?? null
  const delta = peso != null && anterior?.peso != null ? +(peso - anterior.peso).toFixed(1) : null
  const imc = peso && paciente.altura_cm ? +(peso / (paciente.altura_cm / 100) ** 2).toFixed(1) : null

  async function salvar(novoCompartilhado = compartilhado) {
    setSalvando(true)
    const dados = {
      peso: num(form.peso ?? ''), cintura_cm: num(form.cintura_cm ?? ''), quadril_cm: num(form.quadril_cm ?? ''), gordura_pct: num(form.gordura_pct ?? ''),
      pontos_positivos: txt(form.pontos_positivos ?? ''), a_melhorar: txt(form.a_melhorar ?? ''), resumo: txt(form.resumo ?? ''),
      metas_proximo_mes: txt(form.metas_proximo_mes ?? ''), compartilhado: novoCompartilhado,
    }
    const { data, error } = await tentar(api<ResumoMensal>(`/pacientes/${paciente.id}/resumo`, { method: 'PUT', query: { mes: chave }, body: dados }))
    setSalvando(false)
    if (error) return toastErro(error)
    setResumo(data); setCompartilhado(novoCompartilhado)
    toast(novoCompartilhado && !compartilhado ? 'Resumo salvo e compartilhado com o paciente' : 'Resumo salvo')
  }

  const [gerando, setGerando] = useState(false)
  async function baixarPdf() {
    setGerando(true)
    try {
      await gerarRelatorioPdf({
        paciente: paciente.nome, profissional: nomeProfissional, mes, habitos, registros, est, geral,
        maiorSequencia: maiorSeq, semanas, observacoes: obs, resumo, consultas,
      })
    } catch (e) {
      // fechar o "Compartilhar" sem escolher nada não é erro
      if (!/cancel/i.test(String((e as Error)?.message ?? e))) toastErro(e)
    } finally {
      setGerando(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const realizadas = consultas.filter((c) => c.status === 'realizado').length

  if (!carregado) return <div className="py-10 text-center text-sm text-stone-500">Carregando resumo…</div>

  if (!editavel && !resumo?.compartilhado && habitos.length === 0)
    return <div className="py-10 text-center text-sm text-stone-500">Nada por aqui neste mês.</div>

  return (
    <div className="space-y-5">
      {/* relatório em PDF (site: baixa o arquivo; app: abre o Compartilhar) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sage-200 bg-sage-50 p-3">
        <p className="text-sm text-sage-800">
          <b>Relatório de {nomeMes(mes)}</b>
          <span className="block text-xs text-sage-700">Adesão, folha do mês, observações{editavel ? ' e a avaliação (quando compartilhada)' : ''}.</span>
        </p>
        <button className="btn-primary" disabled={gerando} onClick={baixarPdf}>
          {gerando ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          {ehApp ? 'Gerar PDF' : 'Baixar PDF'}
        </button>
      </div>

      {/* cabeçalho só na impressão */}
      <div className="hidden print:block">
        <div className="flex items-end justify-between border-b-2 border-sage-600 pb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500">Resumo mensal de acompanhamento</div>
            <div className="text-2xl font-semibold">{paciente.nome}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{nomeMes(mes)}</div>
            {nomeProfissional && <div className="text-stone-500">{nomeProfissional}</div>}
          </div>
        </div>
      </div>

      {/* indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icone={<Trophy size={16} />} titulo="Adesão geral" valor={geral == null ? '—' : `${geral}%`} cls={corPct(geral)} sub={`${est.reduce((a, e) => a + e.ok, 0)} marcações ✓`} />
        <Kpi icone={<Flame size={16} />} titulo="Maior sequência" valor={`${maiorSeq} ${maiorSeq === 1 ? 'dia' : 'dias'}`} sub={est.find((e) => e.melhorSequencia === maiorSeq && maiorSeq > 0)?.habito.nome ?? '—'} />
        <Kpi icone={delta != null && delta > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} titulo="Peso"
          valor={peso != null ? `${peso.toLocaleString('pt-BR')} kg` : '—'}
          sub={[delta != null && `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} kg vs mês anterior`, imc && `IMC ${imc.toLocaleString('pt-BR')}`].filter(Boolean).join(' · ') || (editavel ? 'registre abaixo' : 'registrado na consulta')} />
        <Kpi icone={<CalendarCheck size={16} />} titulo="Consultas no mês" valor={`${consultas.length}`} sub={`${realizadas} realizada${realizadas === 1 ? '' : 's'}`} />
      </div>

      {/* por hábito + por semana */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <h3 className="mb-3 font-semibold">Desempenho por hábito</h3>
          {est.length === 0 ? <p className="text-sm text-stone-500">Nenhum hábito neste mês.</p> : (
            <div className="space-y-3">
              {est.map((e) => (
                <div key={e.habito.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{e.habito.nome}{e.habito.meta && <span className="font-normal text-stone-500"> · {e.habito.meta}</span>}</span>
                    <span className={`font-semibold tabular-nums ${corPct(e.diasConsiderados ? e.pct : null)}`}>{e.diasConsiderados ? `${e.pct}%` : '—'}</span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="bg-ok" style={{ width: `${e.diasConsiderados ? (e.ok / e.diasConsiderados) * 100 : 0}%` }} />
                    <div className="bg-nao/80" style={{ width: `${e.diasConsiderados ? (e.nao / e.diasConsiderados) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-stone-500">{e.ok} consegui · {e.nao} não consegui · {e.vazio} sem marcação · melhor sequência {e.melhorSequencia}d</div>
                </div>
              ))}
            </div>
          )}
          {est.length > 1 && melhor && pior && melhor.habito.id !== pior.habito.id && (
            <p className="mt-4 rounded-lg bg-sage-50 p-3 text-sm text-sage-800">
              Destaque: <b>{melhor.habito.nome}</b> ({melhor.pct}%). Ponto de atenção: <b>{pior.habito.nome}</b> ({pior.pct}%).
            </p>
          )}
        </div>
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Adesão por semana</h3>
          <div className="flex h-48 gap-2">
            {semanas.map((s) => (
              <div key={s.label} className="flex h-full flex-1 flex-col items-center gap-1">
                <span className={`text-xs font-semibold tabular-nums ${corPct(s.pct)}`}>{s.pct == null ? '—' : `${s.pct}%`}</span>
                <div className="flex w-full flex-1 items-end rounded-md bg-stone-100">
                  <div className="w-full rounded-md bg-sage-500 transition-all" style={{ height: `${s.pct ?? 0}%` }} />
                </div>
                <span className="text-[11px] text-stone-500">{s.label}</span>
                <span className="text-[10px] text-stone-400">{s.faixa}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* folha (cópia somente leitura, útil na impressão) */}
      <div className="hidden space-y-2 print:block">
        <GradeHabitos mes={mes} habitos={habitos} registros={registros} />
        <Legenda editavel={false} />
      </div>

      {/* observações do paciente */}
      <div className="card p-4">
        <h3 className="font-semibold">Observações do paciente</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{obs || <span className="text-stone-400">O paciente ainda não escreveu observações neste mês.</span>}</p>
      </div>

      {/* parte do profissional */}
      {editavel ? (
        <div className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Avaliação do profissional</h3>
            <span className={`chip ${compartilhado ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-600'}`}>
              {compartilhado ? <><Share2 size={11} />visível para o paciente</> : <><Lock size={11} />rascunho privado</>}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo label="Peso (kg)"><input inputMode="decimal" className="input" value={form.peso} onChange={set('peso')} /></Campo>
            <Campo label="Cintura (cm)"><input inputMode="decimal" className="input" value={form.cintura_cm} onChange={set('cintura_cm')} /></Campo>
            <Campo label="Quadril (cm)"><input inputMode="decimal" className="input" value={form.quadril_cm} onChange={set('quadril_cm')} /></Campo>
            <Campo label="% gordura"><input inputMode="decimal" className="input" value={form.gordura_pct} onChange={set('gordura_pct')} /></Campo>
          </div>
          {CAMPOS_TEXTO.map(([k, label, ph]) => (
            <Campo key={k} label={label}>
              <textarea rows={k === 'resumo' ? 7 : 3} className="input print:hidden" value={form[k]} onChange={set(k)} placeholder={ph} />
              <p className="hidden whitespace-pre-wrap text-sm print:block">{form[k] || '—'}</p>
            </Campo>
          ))}
          <div className="no-print flex flex-wrap justify-end gap-2">
            <button className="btn-outline" onClick={() => window.print()}><Printer size={15} />Imprimir / PDF</button>
            {compartilhado
              ? <button className="btn-outline" disabled={salvando} onClick={() => salvar(false)}><Lock size={15} />Tornar privado</button>
              : <button className="btn-outline" disabled={salvando} onClick={() => salvar(true)}><Share2 size={15} />Salvar e compartilhar</button>}
            <button className="btn-primary" disabled={salvando} onClick={() => salvar()}><Save size={15} />{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      ) : resumo?.compartilhado ? (
        <div className="card space-y-4 p-4">
          <h3 className="font-semibold">Avaliação {nomeProfissional ? `de ${nomeProfissional}` : 'do seu nutricionista'}</h3>
          {(resumo.cintura_cm || resumo.quadril_cm || resumo.gordura_pct) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {resumo.cintura_cm && <span>Cintura: <b>{resumo.cintura_cm} cm</b></span>}
              {resumo.quadril_cm && <span>Quadril: <b>{resumo.quadril_cm} cm</b></span>}
              {resumo.gordura_pct && <span>Gordura: <b>{resumo.gordura_pct}%</b></span>}
            </div>
          )}
          {CAMPOS_TEXTO.map(([k, label]) => resumo[k] && (
            <div key={k}><div className="label">{label}</div><p className="whitespace-pre-wrap text-sm">{resumo[k]}</p></div>
          ))}
        </div>
      ) : (
        <p className="no-print text-center text-sm text-stone-500">A avaliação do seu nutricionista aparecerá aqui quando for compartilhada.</p>
      )}

      {/* consultas do mês */}
      {consultas.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">Consultas do mês</h3>
          <ul className="divide-y divide-stone-100 text-sm">
            {consultas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <span className="w-24 shrink-0 tabular-nums text-stone-500">{fmt(c.inicio, 'dd/MM HH:mm')}</span>
                <span className="flex-1">{c.titulo}</span>
                <span className="chip" style={{ background: TIPOS[c.tipo].cor + '1a', color: TIPOS[c.tipo].cor }}>{TIPOS[c.tipo].label}</span>
                <span className="w-20 text-right text-xs text-stone-500">{STATUS[c.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="hidden pt-4 text-center font-script text-lg text-sage-600 print:block">Pequenas ações constroem grandes transformações</p>
    </div>
  )
}

function Kpi({ icone, titulo, valor, sub, cls = '' }: { icone: React.ReactNode; titulo: string; valor: string; sub?: string; cls?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500"><span className="text-sage-600">{icone}</span>{titulo}</div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${cls}`}>{valor}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-stone-500">{sub}</div>}
    </div>
  )
}
