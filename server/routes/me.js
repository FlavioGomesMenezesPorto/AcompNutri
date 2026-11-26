// /api/me — quem sou eu, qual o meu papel, e cadastro do profissional
const { Router } = require('express')
const { one, many, query } = require('../db')
const { v, erro } = require('../util')

const r = Router()

r.get('/', async (req, res) => {
  // liga esta conta Google aos cadastros de paciente feitos com o mesmo e-mail
  await query('update pacientes set user_id = $1 where user_id is null and email = $2', [req.user.id, req.user.email])

  const profissional = await one('select * from profissionais where id = $1', [req.user.id])
  const pacientes = await many(
    `select p.*, json_build_object('nome', pr.nome, 'crn', pr.crn) as profissional
       from pacientes p join profissionais pr on pr.id = p.profissional_id
      where p.user_id = $1 and p.ativo
      order by p.created_at`,
    [req.user.id],
  )
  const papel = profissional ? 'profissional' : pacientes.length ? 'paciente' : 'novo'
  res.json({ usuario: req.user, papel, profissional, pacientes })
})

function dadosProf(body) {
  return {
    nome: v.texto(body.nome, 'nome', { obrigatorio: true, min: 2, max: 120 }),
    crn: v.texto(body.crn, 'CRN', { max: 40 }),
    telefone: v.texto(body.telefone, 'telefone', { max: 40 }),
  }
}

r.post('/profissional', async (req, res) => {
  const d = dadosProf(req.body)
  const existe = await one('select 1 from profissionais where id = $1', [req.user.id])
  if (existe) throw erro(409, 'Você já tem um consultório cadastrado.')
  const p = await one(
    `insert into profissionais (id, nome, crn, telefone, email, avatar_url) values ($1, $2, $3, $4, $5, $6) returning *`,
    [req.user.id, d.nome, d.crn, d.telefone, req.user.email, req.user.avatar_url],
  )
  res.status(201).json(p)
})

r.put('/profissional', async (req, res) => {
  const d = dadosProf(req.body)
  const p = await one(
    `update profissionais set nome = $2, crn = $3, telefone = $4 where id = $1 returning *`,
    [req.user.id, d.nome, d.crn, d.telefone],
  )
  if (!p) throw erro(404, 'Consultório não encontrado.')
  res.json(p)
})

module.exports = r
