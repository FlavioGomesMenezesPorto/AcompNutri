// /api/habitos/:id — editar/excluir (nutricionista) e marcar dias (nutricionista ou paciente)
const { Router } = require('express')
const { one, query } = require('../db')
const { v, erro, hoje, somarDias, acessoPaciente } = require('../util')

const r = Router()

async function carregar(req) {
  const h = await one('select * from habitos where id = $1', [v.uuid(req.params.id, 'hábito')])
  if (!h) throw erro(404, 'Hábito não encontrado.')
  const { papel } = await acessoPaciente(req, h.paciente_id)
  return { h, papel }
}

r.put('/:id', async (req, res) => {
  const { h, papel } = await carregar(req)
  if (papel !== 'prof') throw erro(403, 'Apenas o nutricionista pode editar hábitos.')
  const b = req.body
  const inicio = v.data(b.inicio, 'início') || h.inicio
  const fim = b.fim === undefined ? h.fim : v.data(b.fim, 'fim')
  if (fim && fim < inicio) throw erro(400, 'O fim não pode ser antes do início.')
  res.json(await one(
    `update habitos set nome = $2, meta = $3, cor = $4, inicio = $5, fim = $6 where id = $1 returning *`,
    [h.id, v.texto(b.nome, 'hábito', { obrigatorio: true, max: 80 }), v.texto(b.meta, 'meta', { max: 80 }), v.cor(b.cor), inicio, fim],
  ))
})

r.delete('/:id', async (req, res) => {
  const { h, papel } = await carregar(req)
  if (papel !== 'prof') throw erro(403, 'Apenas o nutricionista pode excluir hábitos.')
  await query('delete from habitos where id = $1', [h.id])
  res.status(204).end()
})

/** Marca um dia: { status: 'ok' | 'nao' | null } (null apaga a marcação) */
r.put('/:id/registros/:data', async (req, res) => {
  const { h, papel } = await carregar(req)
  const data = v.data(req.params.data, 'data', { obrigatorio: true })
  if (data < h.inicio || (h.fim && data > h.fim)) throw erro(400, 'O hábito não estava ativo nesse dia.')
  // o paciente não marca dias futuros (1 dia de folga por causa de fuso)
  if (papel === 'paciente' && data > somarDias(hoje(), 1)) throw erro(400, 'Não é possível marcar dias futuros.')

  const status = req.body.status ?? null
  if (status === null) {
    await query('delete from registros_habito where habito_id = $1 and data = $2', [h.id, data])
    return res.json({ habito_id: h.id, data, status: null })
  }
  if (!['ok', 'nao'].includes(status)) throw erro(400, 'Status inválido.')
  res.json(await one(
    `insert into registros_habito (habito_id, data, status, updated_at) values ($1, $2, $3, now())
     on conflict (habito_id, data) do update set status = excluded.status, updated_at = now()
     returning habito_id, data, status`,
    [h.id, data, status],
  ))
})

module.exports = r
