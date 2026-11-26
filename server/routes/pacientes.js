// /api/pacientes — cadastro (só o nutricionista) e dados do paciente
// (hábitos, resumo do mês, observações, consultas: nutricionista e o próprio paciente)
const { Router } = require('express')
const { one, many, query } = require('../db')
const { v, erro, hoje, mesParam, exigirProfissional, acessoPaciente, exigirProfDoPaciente } = require('../util')

const r = Router()

/* ================= cadastro (nutricionista) ================= */

function dadosPaciente(b) {
  return {
    nome: v.texto(b.nome, 'nome', { obrigatorio: true, min: 2, max: 120 }),
    email: v.email(b.email),
    telefone: v.texto(b.telefone, 'telefone', { max: 40 }),
    data_nascimento: v.data(b.data_nascimento, 'data de nascimento'),
    altura_cm: v.numero(b.altura_cm, 'altura', { min: 30, max: 260 }),
    peso_inicial: v.numero(b.peso_inicial, 'peso inicial', { min: 1, max: 500 }),
    objetivo: v.texto(b.objetivo, 'objetivo', { max: 300 }),
    observacoes: v.texto(b.observacoes, 'anotações', { max: 4000 }),
  }
}

r.get('/', async (req, res) => {
  await exigirProfissional(req)
  const soAtivos = req.query.ativos === '1'
  res.json(await many(
    `select * from pacientes where profissional_id = $1 ${soAtivos ? 'and ativo' : ''} order by nome`,
    [req.user.id],
  ))
})

/** Adesão aos hábitos no mês atual, por paciente ativo: { [id]: % | null } */
r.get('/adesao', async (req, res) => {
  await exigirProfissional(req)
  const hj = hoje()
  const ini = hj.slice(0, 8) + '01'
  const linhas = await many(
    `with dias as (select generate_series($2::date, $3::date, interval '1 day')::date as d)
     select h.paciente_id,
            count(*) filter (where r.status = 'ok')::int as ok,
            count(*)::int as total
       from pacientes p
       join habitos h on h.paciente_id = p.id
       join dias on dias.d >= h.inicio and (h.fim is null or dias.d <= h.fim)
       left join registros_habito r on r.habito_id = h.id and r.data = dias.d
      where p.profissional_id = $1 and p.ativo
      group by h.paciente_id`,
    [req.user.id, ini, hj],
  )
  const out = {}
  for (const l of linhas) out[l.paciente_id] = l.total ? Math.round((l.ok / l.total) * 100) : null
  res.json(out)
})

r.post('/', async (req, res) => {
  await exigirProfissional(req)
  const d = dadosPaciente(req.body)
  const p = await one(
    `insert into pacientes (profissional_id, nome, email, telefone, data_nascimento, altura_cm, peso_inicial, objetivo, observacoes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
    [req.user.id, d.nome, d.email, d.telefone, d.data_nascimento, d.altura_cm, d.peso_inicial, d.objetivo, d.observacoes],
  )
  res.status(201).json(p)
})

r.get('/:id', async (req, res) => {
  res.json(await exigirProfDoPaciente(req, req.params.id))
})

r.put('/:id', async (req, res) => {
  const atual = await exigirProfDoPaciente(req, req.params.id)
  const d = dadosPaciente(req.body)
  // se o e-mail mudou, desfaz o vínculo antigo (o novo e-mail será vinculado no próximo login)
  const desvincular = (atual.email || null) !== d.email
  const p = await one(
    `update pacientes set nome = $2, email = $3, telefone = $4, data_nascimento = $5, altura_cm = $6,
            peso_inicial = $7, objetivo = $8, observacoes = $9 ${desvincular ? ', user_id = null' : ''}
      where id = $1 returning *`,
    [atual.id, d.nome, d.email, d.telefone, d.data_nascimento, d.altura_cm, d.peso_inicial, d.objetivo, d.observacoes],
  )
  res.json(p)
})

/** Arquivar / reativar */
r.patch('/:id', async (req, res) => {
  const atual = await exigirProfDoPaciente(req, req.params.id)
  if (typeof req.body.ativo !== 'boolean') throw erro(400, 'Envie { ativo: true|false }.')
  res.json(await one('update pacientes set ativo = $2 where id = $1 returning *', [atual.id, req.body.ativo]))
})

r.delete('/:id', async (req, res) => {
  const atual = await exigirProfDoPaciente(req, req.params.id)
  await query('delete from pacientes where id = $1', [atual.id])
  res.status(204).end()
})

/* ================= hábitos do mês ================= */

r.get('/:id/habitos', async (req, res) => {
  const { paciente } = await acessoPaciente(req, req.params.id)
  const { inicio, fim } = mesParam(req.query.mes)
  const habitos = await many(
    `select * from habitos where paciente_id = $1 and inicio <= $3 and (fim is null or fim >= $2)
      order by ordem, created_at`,
    [paciente.id, inicio, fim],
  )
  const registros = habitos.length
    ? await many(
      `select habito_id, data, status from registros_habito
        where habito_id = any($1::uuid[]) and data between $2 and $3`,
      [habitos.map((h) => h.id), inicio, fim],
    )
    : []
  res.json({ habitos, registros })
})

r.post('/:id/habitos', async (req, res) => {
  const paciente = await exigirProfDoPaciente(req, req.params.id)
  const b = req.body
  const ordem = (await one('select coalesce(max(ordem) + 1, 0)::int as n from habitos where paciente_id = $1', [paciente.id])).n
  const h = await one(
    `insert into habitos (paciente_id, nome, meta, cor, inicio, ordem) values ($1, $2, $3, $4, $5, $6) returning *`,
    [paciente.id, v.texto(b.nome, 'hábito', { obrigatorio: true, max: 80 }), v.texto(b.meta, 'meta', { max: 80 }),
      v.cor(b.cor), v.data(b.inicio, 'início') || hoje(), ordem],
  )
  res.status(201).json(h)
})

/* ================= resumo do mês ================= */

r.get('/:id/resumo', async (req, res) => {
  const { papel, paciente } = await acessoPaciente(req, req.params.id)
  const { inicio, fim } = mesParam(req.query.mes)
  const anterior = new Date(inicio + 'T00:00:00Z'); anterior.setUTCMonth(anterior.getUTCMonth() - 1)

  let resumo = await one('select * from resumos_mensais where paciente_id = $1 and mes = $2', [paciente.id, inicio])
  // o paciente só vê o resumo do profissional depois de compartilhado
  if (papel === 'paciente' && resumo && !resumo.compartilhado) resumo = null

  const ant = await one(
    `select peso from resumos_mensais where paciente_id = $1 and mes = $2 ${papel === 'paciente' ? 'and compartilhado' : ''}`,
    [paciente.id, anterior.toISOString().slice(0, 10)],
  )
  const obs = await one('select texto from observacoes_mes where paciente_id = $1 and mes = $2', [paciente.id, inicio])
  const consultas = await many(
    `select * from compromissos where paciente_id = $1
        and inicio >= ($2::date::timestamp at time zone $4)
        and inicio <  (($3::date + 1)::timestamp at time zone $4)
      order by inicio`,
    [paciente.id, inicio, fim, process.env.APP_TIMEZONE || 'America/Sao_Paulo'],
  )
  res.json({ resumo, peso_anterior: ant?.peso ?? null, observacoes: obs?.texto ?? '', consultas })
})

r.put('/:id/resumo', async (req, res) => {
  const paciente = await exigirProfDoPaciente(req, req.params.id)
  const { inicio } = mesParam(req.query.mes)
  const b = req.body
  const t = (campo, nome) => v.texto(b[campo], nome, { max: 20000 })
  const resumo = await one(
    `insert into resumos_mensais (paciente_id, mes, peso, cintura_cm, quadril_cm, gordura_pct,
            pontos_positivos, a_melhorar, resumo, metas_proximo_mes, compartilhado, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     on conflict (paciente_id, mes) do update set
       peso = excluded.peso, cintura_cm = excluded.cintura_cm, quadril_cm = excluded.quadril_cm,
       gordura_pct = excluded.gordura_pct, pontos_positivos = excluded.pontos_positivos,
       a_melhorar = excluded.a_melhorar, resumo = excluded.resumo, metas_proximo_mes = excluded.metas_proximo_mes,
       compartilhado = excluded.compartilhado, updated_at = now()
     returning *`,
    [paciente.id, inicio,
      v.numero(b.peso, 'peso', { min: 1, max: 500 }), v.numero(b.cintura_cm, 'cintura', { min: 10, max: 300 }),
      v.numero(b.quadril_cm, 'quadril', { min: 10, max: 300 }), v.numero(b.gordura_pct, '% gordura', { min: 1, max: 80 }),
      t('pontos_positivos', 'pontos positivos'), t('a_melhorar', 'a melhorar'), t('resumo', 'resumo'),
      t('metas_proximo_mes', 'metas'), b.compartilhado === true],
  )
  res.json(resumo)
})

/* ================= observações do paciente ================= */

r.get('/:id/observacoes', async (req, res) => {
  const { paciente } = await acessoPaciente(req, req.params.id)
  const { inicio } = mesParam(req.query.mes)
  const o = await one('select texto, updated_at from observacoes_mes where paciente_id = $1 and mes = $2', [paciente.id, inicio])
  res.json({ texto: o?.texto ?? '', updated_at: o?.updated_at ?? null })
})

r.put('/:id/observacoes', async (req, res) => {
  const { paciente } = await acessoPaciente(req, req.params.id)
  const { inicio } = mesParam(req.query.mes)
  const texto = typeof req.body.texto === 'string' ? req.body.texto.slice(0, 4000) : ''
  const o = await one(
    `insert into observacoes_mes (paciente_id, mes, texto, updated_at) values ($1, $2, $3, now())
     on conflict (paciente_id, mes) do update set texto = excluded.texto, updated_at = now()
     returning texto, updated_at`,
    [paciente.id, inicio, texto],
  )
  res.json(o)
})

/* ================= consultas do paciente ================= */

r.get('/:id/compromissos', async (req, res) => {
  const { paciente } = await acessoPaciente(req, req.params.id)
  const futuros = req.query.futuros === '1'
  const limite = Math.min(Number(req.query.limite) || 200, 500)
  res.json(await many(
    `select * from compromissos where paciente_id = $1
       ${futuros ? "and inicio >= now() and status <> 'cancelado'" : ''}
      order by inicio ${futuros ? 'asc' : 'desc'} limit $2`,
    [paciente.id, limite],
  ))
})

module.exports = r
