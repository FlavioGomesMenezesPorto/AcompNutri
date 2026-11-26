const { one } = require('./db')

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const erro = (status, msg) => new HttpError(status, msg)

/* ---------- datas (no fuso do app, padrão São Paulo) ---------- */
const TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo'
/** 'yyyy-MM-dd' de hoje no fuso do app */
function hoje() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/
/** Lê ?mes=yyyy-MM ou yyyy-MM-dd e devolve { inicio:'yyyy-MM-01', fim:'yyyy-MM-ult' } */
function mesParam(v) {
  const m = /^(\d{4})-(\d{2})/.exec(String(v || ''))
  if (!m) throw erro(400, 'Parâmetro "mes" inválido (use AAAA-MM).')
  const ano = Number(m[1]), mes = Number(m[2])
  if (mes < 1 || mes > 12) throw erro(400, 'Mês inválido.')
  const ult = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return { inicio: `${m[1]}-${m[2]}-01`, fim: `${m[1]}-${m[2]}-${String(ult).padStart(2, '0')}` }
}
function somarDias(data, n) {
  const d = new Date(data + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* ---------- validação de campos ---------- */
const v = {
  texto(x, campo, { max = 4000, obrigatorio = false, min = 0 } = {}) {
    if (x === undefined || x === null || String(x).trim() === '') {
      if (obrigatorio) throw erro(400, `Preencha o campo "${campo}".`)
      return null
    }
    const s = String(x).trim()
    if (s.length < min) throw erro(400, `"${campo}" é muito curto.`)
    if (s.length > max) throw erro(400, `"${campo}" passou de ${max} caracteres.`)
    return s
  },
  numero(x, campo, { min = 0, max = 1000 } = {}) {
    if (x === undefined || x === null || x === '') return null
    const n = Number(String(x).replace(',', '.'))
    if (!Number.isFinite(n) || n < min || n > max) throw erro(400, `"${campo}" inválido.`)
    return n
  },
  data(x, campo, { obrigatorio = false } = {}) {
    if (!x) { if (obrigatorio) throw erro(400, `Informe "${campo}".`); return null }
    if (!RE_DATA.test(x) || Number.isNaN(Date.parse(x))) throw erro(400, `"${campo}" inválida.`)
    return x
  },
  instante(x, campo, { obrigatorio = false } = {}) {
    if (!x) { if (obrigatorio) throw erro(400, `Informe "${campo}".`); return null }
    const d = new Date(x)
    if (Number.isNaN(d.getTime())) throw erro(400, `"${campo}" inválido.`)
    return d.toISOString()
  },
  opcao(x, campo, opcoes, padrao) {
    if (x === undefined || x === null || x === '') return padrao
    if (!opcoes.includes(x)) throw erro(400, `"${campo}" inválido.`)
    return x
  },
  email(x) {
    const s = v.texto(x, 'e-mail', { max: 254 })
    if (!s) return null
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw erro(400, 'E-mail inválido.')
    return s.toLowerCase()
  },
  cor(x) { return /^#[0-9a-fA-F]{6}$/.test(x || '') ? x : '#6b8f71' },
  uuid(x, campo = 'id') {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x || ''))) throw erro(400, `${campo} inválido.`)
    return x
  },
}

/* ---------- permissões ---------- */
/** O usuário logado é profissional? (lança 403 se não for) */
async function exigirProfissional(req) {
  const p = await one('select * from profissionais where id = $1', [req.user.id])
  if (!p) throw erro(403, 'Disponível apenas para nutricionistas.')
  return p
}

/**
 * Qual a relação do usuário com o paciente?
 * 'prof' = é o nutricionista dele · 'paciente' = é o próprio paciente · 404 caso contrário.
 */
async function acessoPaciente(req, pacienteId) {
  v.uuid(pacienteId, 'paciente')
  const p = await one('select * from pacientes where id = $1', [pacienteId])
  if (p && p.profissional_id === req.user.id) return { papel: 'prof', paciente: p }
  if (p && p.user_id === req.user.id && p.ativo) return { papel: 'paciente', paciente: p }
  throw erro(404, 'Paciente não encontrado.')
}

async function exigirProfDoPaciente(req, pacienteId) {
  const a = await acessoPaciente(req, pacienteId)
  if (a.papel !== 'prof') throw erro(403, 'Apenas o nutricionista pode fazer isso.')
  return a.paciente
}

module.exports = { HttpError, erro, hoje, mesParam, somarDias, v, exigirProfissional, acessoPaciente, exigirProfDoPaciente }
