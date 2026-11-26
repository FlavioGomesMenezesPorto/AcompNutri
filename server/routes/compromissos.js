// /api/compromissos — agenda do nutricionista
const { Router } = require('express')
const { one, many, query } = require('../db')
const { v, erro, exigirProfissional } = require('../util')

const r = Router()
const TIPOS = ['consulta', 'retorno', 'online', 'avaliacao', 'lembrete', 'outro']
const STATUS = ['agendado', 'realizado', 'cancelado', 'faltou']

const COM_PACIENTE = `select c.*, case when p.id is null then null else json_build_object('nome', p.nome) end as pacientes
                        from compromissos c left join pacientes p on p.id = c.paciente_id`

async function dados(req) {
  const b = req.body
  const inicio = v.instante(b.inicio, 'início', { obrigatorio: true })
  const fim = v.instante(b.fim, 'fim')
  if (fim && fim < inicio) throw erro(400, 'O fim não pode ser antes do início.')
  let paciente_id = null
  if (b.paciente_id) {
    const p = await one('select id from pacientes where id = $1 and profissional_id = $2', [v.uuid(b.paciente_id, 'paciente'), req.user.id])
    if (!p) throw erro(400, 'Paciente não encontrado.')
    paciente_id = p.id
  }
  return {
    titulo: v.texto(b.titulo, 'título', { obrigatorio: true, max: 120 }),
    tipo: v.opcao(b.tipo, 'tipo', TIPOS, 'consulta'),
    status: v.opcao(b.status, 'situação', STATUS, 'agendado'),
    inicio, fim, paciente_id,
    local: v.texto(b.local, 'local', { max: 300 }),
    notas: v.texto(b.notas, 'anotações', { max: 4000 }),
  }
}

/** ?de=ISO&ate=ISO (obrigatórios) — opcional &semCancelados=1 &limite=N */
r.get('/', async (req, res) => {
  await exigirProfissional(req)
  const de = v.instante(req.query.de, 'de', { obrigatorio: true })
  const ate = v.instante(req.query.ate, 'ate', { obrigatorio: true })
  const limite = Math.min(Number(req.query.limite) || 500, 1000)
  res.json(await many(
    `${COM_PACIENTE} where c.profissional_id = $1 and c.inicio between $2 and $3
       ${req.query.semCancelados === '1' ? "and c.status <> 'cancelado'" : ''}
     order by c.inicio limit $4`,
    [req.user.id, de, ate, limite],
  ))
})

r.post('/', async (req, res) => {
  await exigirProfissional(req)
  const d = await dados(req)
  const c = await one(
    `insert into compromissos (profissional_id, paciente_id, titulo, tipo, inicio, fim, local, notas, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [req.user.id, d.paciente_id, d.titulo, d.tipo, d.inicio, d.fim, d.local, d.notas, d.status],
  )
  res.status(201).json(await one(`${COM_PACIENTE} where c.id = $1`, [c.id]))
})

r.put('/:id', async (req, res) => {
  await exigirProfissional(req)
  const d = await dados(req)
  const c = await one(
    `update compromissos set paciente_id = $3, titulo = $4, tipo = $5, inicio = $6, fim = $7, local = $8, notas = $9, status = $10
      where id = $1 and profissional_id = $2 returning id`,
    [v.uuid(req.params.id), req.user.id, d.paciente_id, d.titulo, d.tipo, d.inicio, d.fim, d.local, d.notas, d.status],
  )
  if (!c) throw erro(404, 'Compromisso não encontrado.')
  res.json(await one(`${COM_PACIENTE} where c.id = $1`, [c.id]))
})

r.delete('/:id', async (req, res) => {
  await exigirProfissional(req)
  const { rowCount } = await query('delete from compromissos where id = $1 and profissional_id = $2', [v.uuid(req.params.id), req.user.id])
  if (!rowCount) throw erro(404, 'Compromisso não encontrado.')
  res.status(204).end()
})

module.exports = r
