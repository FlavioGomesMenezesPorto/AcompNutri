// Relatório mensal em PDF — gerado no próprio aparelho (funciona no site e no app Android,
// onde a impressão do navegador não existe). No app, abre o "Compartilhar" do Android.
import { diasDoMes, fmt, habitoAtivoEm, hoje, nomeMes, ymd } from './datas'
import type { EstatHabito } from './habitos'
import type { Compromisso, Habito, ResumoMensal, StatusRegistro } from './types'
import { STATUS, TIPOS } from './types'
import { ehApp } from './nativo'

export type DadosRelatorio = {
  paciente: string
  profissional?: string
  mes: Date
  habitos: Habito[]
  registros: Record<string, StatusRegistro>
  est: EstatHabito[]
  geral: number | null
  maiorSequencia: number
  semanas: { label: string; faixa: string; pct: number | null }[]
  observacoes: string
  resumo: ResumoMensal | null // só entra se compartilhado
  consultas: Compromisso[]
}

const VERDE: [number, number, number] = [95, 127, 100]
const OK: [number, number, number] = [74, 153, 96]
const NAO: [number, number, number] = [200, 85, 80]
const CINZA: [number, number, number] = [120, 113, 108]

export async function gerarRelatorioPdf(d: DadosRelatorio) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 12, W = 210 - 2 * L
  let y = 14
  const fimTabela = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  const titulo = (t: string) => {
    if (y > 260) { doc.addPage(); y = 16 }
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40)
    doc.text(t, L, y); y += 2
  }
  const paragrafo = (t: string) => {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60)
    for (const linha of doc.splitTextToSize(t, W) as string[]) {
      if (y > 282) { doc.addPage(); y = 16 }
      y += 4.6; doc.text(linha, L, y)
    }
    y += 9
  }

  // cabeçalho
  doc.setFillColor(...VERDE).rect(0, 0, 210, 26, 'F')
  doc.setTextColor(255).setFont('helvetica', 'normal').setFontSize(9)
  doc.text('RELATÓRIO MENSAL · ACOMPNUTRI', L, 9)
  doc.setFont('helvetica', 'bold').setFontSize(16).text(d.paciente, L, 17)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text(nomeMes(d.mes), 210 - L, 11, { align: 'right' })
  if (d.profissional) doc.text(`Nutricionista: ${d.profissional}`, 210 - L, 17, { align: 'right' })
  y = 34

  // indicadores
  const marcacoes = d.est.reduce((a, e) => a + e.ok, 0)
  const kpis = [
    ['Adesão geral', d.geral == null ? '—' : `${d.geral}%`],
    ['Marcações "consegui"', String(marcacoes)],
    ['Maior sequência', `${d.maiorSequencia} ${d.maiorSequencia === 1 ? 'dia' : 'dias'}`],
    ['Consultas no mês', String(d.consultas.length)],
  ]
  const kw = W / 4
  kpis.forEach(([k, v], i) => {
    const x = L + i * kw
    doc.setDrawColor(225).setFillColor(248, 249, 246).roundedRect(x, y, kw - 3, 17, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...CINZA).text(k!, x + 3, y + 5.5)
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(40).text(v!, x + 3, y + 13)
  })
  y += 25

  // desempenho por hábito
  titulo('Desempenho por hábito')
  autoTable(doc, {
    startY: y + 2, margin: { left: L, right: L },
    head: [['Hábito', 'Consegui', 'Não consegui', 'Sem marcação', 'Melhor sequência', 'Adesão']],
    body: d.est.length
      ? d.est.map((e) => [
        e.habito.nome + (e.habito.meta ? ` (${e.habito.meta})` : ''),
        e.ok, e.nao, e.vazio, `${e.melhorSequencia} d`, e.diasConsiderados ? `${e.pct}%` : '—'])
      : [['Nenhum hábito neste mês', '', '', '', '', '']],
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: VERDE },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', fontStyle: 'bold' } },
  })
  y = fimTabela() + 9

  // adesão por semana
  titulo('Adesão por semana')
  autoTable(doc, {
    startY: y + 2, margin: { left: L, right: L },
    head: [d.semanas.map((s) => `${s.label} (${s.faixa})`)],
    body: [d.semanas.map((s) => (s.pct == null ? '—' : `${s.pct}%`))],
    styles: { fontSize: 9, halign: 'center', cellPadding: 1.8 },
    headStyles: { fillColor: VERDE },
  })
  y = fimTabela() + 9

  // folha do mês (dia a dia)
  if (d.habitos.length) {
    titulo('Folha do mês')
    const hj = hoje()
    const dias = diasDoMes(d.mes).map(ymd)
    autoTable(doc, {
      startY: y + 2, margin: { left: L, right: L },
      head: [['Hábito', ...dias.map((x) => x.slice(8))]],
      body: d.habitos.map((h) => [h.nome, ...dias.map((x) => {
        const s = d.registros[`${h.id}|${x}`]
        return s === 'ok' ? 'v' : s === 'nao' ? 'x' : !habitoAtivoEm(h, x) || x > hj ? '' : '·'
      })]),
      styles: { fontSize: 6.5, cellPadding: 0.8, halign: 'center', lineWidth: 0.1, lineColor: 220 },
      headStyles: { fillColor: VERDE, fontSize: 6 },
      columnStyles: { 0: { halign: 'left', cellWidth: 30, fontSize: 7 } },
      didParseCell: (c) => {
        if (c.section !== 'body' || c.column.index === 0) return
        if (c.cell.raw === 'v') { c.cell.styles.fillColor = OK; c.cell.styles.textColor = 255 }
        if (c.cell.raw === 'x') { c.cell.styles.fillColor = NAO; c.cell.styles.textColor = 255 }
      },
    })
    y = fimTabela() + 4
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...CINZA)
    doc.text('v = consegui · x = não consegui · · = sem marcação', L, y + 2)
    y += 10
  }

  // observações do paciente
  titulo('Observações do paciente')
  paragrafo(d.observacoes.trim() || 'Sem observações neste mês.')

  // avaliação do nutricionista (só se compartilhada)
  const r = d.resumo
  if (r?.compartilhado) {
    titulo(`Avaliação ${d.profissional ? `de ${d.profissional}` : 'do nutricionista'}`)
    const n = (x: number) => x.toLocaleString('pt-BR')
    const medidas = [
      r.peso != null && `Peso: ${n(r.peso)} kg`, r.cintura_cm != null && `Cintura: ${n(r.cintura_cm)} cm`,
      r.quadril_cm != null && `Quadril: ${n(r.quadril_cm)} cm`, r.gordura_pct != null && `Gordura: ${n(r.gordura_pct)}%`,
    ].filter(Boolean).join('   ·   ')
    if (medidas) paragrafo(medidas)
    const campos: [keyof ResumoMensal, string][] = [
      ['pontos_positivos', 'Pontos positivos'], ['a_melhorar', 'O que precisa melhorar'],
      ['resumo', 'Resumo / análise'], ['metas_proximo_mes', 'Metas para o próximo mês'],
    ]
    for (const [k, label] of campos) {
      const t = r[k]
      if (typeof t !== 'string' || !t.trim()) continue
      if (y > 272) { doc.addPage(); y = 16 }
      doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...VERDE)
      y += 1; doc.text(label, L, y)
      y += 0.5
      paragrafo(t)
      y -= 3
    }
    y += 3
  }

  // consultas
  if (d.consultas.length) {
    titulo('Consultas do mês')
    autoTable(doc, {
      startY: y + 2, margin: { left: L, right: L },
      head: [['Data', 'Consulta', 'Tipo', 'Situação']],
      body: d.consultas.map((c) => [fmt(c.inicio, 'dd/MM HH:mm'), c.titulo, TIPOS[c.tipo].label, STATUS[c.status]]),
      styles: { fontSize: 9, cellPadding: 1.8 }, headStyles: { fillColor: VERDE },
    })
    y = fimTabela() + 8
  }

  // rodapé em todas as páginas
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(...CINZA)
    doc.text('Pequenas ações constroem grandes transformações', L, 290)
    doc.text(`Gerado em ${fmt(new Date(), 'dd/MM/yyyy')} · página ${i} de ${paginas}`, 210 - L, 290, { align: 'right' })
  }

  const nome = `relatorio-${fmt(d.mes, 'yyyy-MM')}-${d.paciente.split(' ')[0]!.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')}.pdf`

  if (!ehApp) { doc.save(nome); return }

  // app Android: salva no cache e abre o "Compartilhar" (WhatsApp, Drive, e-mail, salvar…)
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const base64 = doc.output('datauristring').split(',')[1]!
  const { uri } = await Filesystem.writeFile({ path: nome, data: base64, directory: Directory.Cache })
  await Share.share({ title: `Relatório ${nomeMes(d.mes)}`, files: [uri], dialogTitle: 'Enviar ou salvar o relatório' })
}
