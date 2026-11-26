// Teste de ponta a ponta da API, sem depender de nada externo:
// - Postgres embutido (PGlite) atendendo pelo protocolo normal do Postgres
// - um "Supabase falso" que publica as chaves públicas (JWKS) e assina tokens
// Rodar: npm test (na pasta server)
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { randomUUID } = require('node:crypto')

let api, servidorApi, servidorJwks, pgServer, db, jose, chave, base

async function token(user) {
  return new jose.SignJWT({ email: user.email, user_metadata: { full_name: user.nome }, role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: 'teste' })
    .setSubject(user.id).setIssuer(`${process.env.SUPABASE_URL}/auth/v1`).setAudience('authenticated')
    .setIssuedAt().setExpirationTime('1h').sign(chave.privateKey)
}

function cliente(user) {
  return async (metodo, caminho, corpo) => {
    const r = await fetch(base + caminho, {
      method: metodo,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(user)}` },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
    const texto = await r.text()
    return { status: r.status, body: texto ? JSON.parse(texto) : null }
  }
}

const anaProf = { id: randomUUID(), email: 'ana.nutri@exemplo.com', nome: 'Ana Nutri' }
const brunoProf = { id: randomUUID(), email: 'bruno@exemplo.com', nome: 'Bruno' }
const maria = { id: randomUUID(), email: 'Maria@Exemplo.com', nome: 'Maria Paciente' }

before(async () => {
  jose = await import('jose')
  chave = await jose.generateKeyPair('ES256')
  const jwk = { ...(await jose.exportJWK(chave.publicKey)), kid: 'teste', alg: 'ES256', use: 'sig' }

  servidorJwks = http.createServer((req, res) => {
    if (req.url === '/auth/v1/.well-known/jwks.json') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ keys: [jwk] })) }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => servidorJwks.listen(0, '127.0.0.1', r))

  const { PGlite } = await import('@electric-sql/pglite')
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
  db = await PGlite.create()
  pgServer = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' })
  await pgServer.start()
  const pgPorta = pgServer.server?.address?.().port ?? pgServer.port

  process.env.DATABASE_URL = `postgres://postgres@127.0.0.1:${pgPorta}/postgres`
  process.env.DATABASE_POOL_MAX = '1' // o PGlite atende uma conexão por vez
  process.env.SUPABASE_URL = `http://127.0.0.1:${servidorJwks.address().port}`
  process.env.PORT = '0'

  api = require('../index.js')
  servidorApi = await api.start()
  await new Promise((r) => (servidorApi.listening ? r() : servidorApi.once('listening', r)))
  base = `http://127.0.0.1:${servidorApi.address().port}`
})

after(async () => {
  servidorApi?.close()
  servidorJwks?.close()
  await require('../db').pool.end().catch(() => {})
  await pgServer?.stop()
  await db?.close()
})

const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

test('sem token ou com token falso → 401', async () => {
  assert.equal((await fetch(base + '/api/me')).status, 401)
  const r = await fetch(base + '/api/me', { headers: { authorization: 'Bearer abc.def.ghi' } })
  assert.equal(r.status, 401)
})

test('fluxo completo: nutricionista, paciente, hábitos, resumo, agenda e permissões', async () => {
  const ana = cliente(anaProf), bruno = cliente(brunoProf), pac = cliente(maria)
  const mes = hojeSP().slice(0, 7)

  // primeiro acesso: "novo"; cria o consultório
  let r = await ana('GET', '/api/me')
  assert.equal(r.status, 200); assert.equal(r.body.papel, 'novo')
  r = await ana('POST', '/api/me/profissional', { nome: 'Ana Nutri', crn: 'CRN-9 123' })
  assert.equal(r.status, 201)
  assert.equal((await ana('GET', '/api/me')).body.papel, 'profissional')
  assert.equal((await bruno('POST', '/api/me/profissional', { nome: 'Bruno' })).status, 201)

  // quem não é profissional não lista pacientes
  assert.equal((await pac('GET', '/api/pacientes')).status, 403)

  // cadastra a paciente pelo e-mail (normalizado para minúsculas)
  r = await ana('POST', '/api/pacientes', { nome: 'Maria Silva', email: 'MARIA@exemplo.com', altura_cm: '165' })
  assert.equal(r.status, 201); assert.equal(r.body.email, 'maria@exemplo.com'); assert.equal(r.body.altura_cm, 165)
  const pid = r.body.id

  // validação
  assert.equal((await ana('POST', '/api/pacientes', { nome: 'x' })).status, 400)
  assert.equal((await ana('POST', '/api/pacientes', { nome: 'Fulano', email: 'sem-arroba' })).status, 400)

  // a paciente entra com o Google e é vinculada automaticamente
  r = await pac('GET', '/api/me')
  assert.equal(r.body.papel, 'paciente')
  assert.equal(r.body.pacientes[0].id, pid)
  assert.equal(r.body.pacientes[0].profissional.nome, 'Ana Nutri')

  // outro nutricionista não enxerga a paciente da Ana
  assert.equal((await bruno('GET', `/api/pacientes/${pid}`)).status, 404)
  assert.equal((await bruno('GET', `/api/pacientes/${pid}/habitos?mes=${mes}`)).status, 404)
  assert.equal((await bruno('GET', '/api/pacientes')).body.length, 0)

  // hábitos: só a nutricionista cria
  const inicio = hojeSP().slice(0, 8) + '01'
  r = await ana('POST', `/api/pacientes/${pid}/habitos`, { nome: 'Água', meta: '+3 litros', inicio })
  assert.equal(r.status, 201)
  const hid = r.body.id
  assert.equal((await pac('POST', `/api/pacientes/${pid}/habitos`, { nome: 'Hack' })).status, 403)
  assert.equal((await pac('PUT', `/api/habitos/${hid}`, { nome: 'Hack' })).status, 403)
  assert.equal((await pac('DELETE', `/api/habitos/${hid}`)).status, 403)

  // a paciente marca hoje; não marca dia futuro
  r = await pac('PUT', `/api/habitos/${hid}/registros/${hojeSP()}`, { status: 'ok' })
  assert.equal(r.status, 200); assert.equal(r.body.status, 'ok')
  assert.equal((await pac('PUT', `/api/habitos/${hid}/registros/2099-01-01`, { status: 'ok' })).status, 400)
  assert.equal((await pac('PUT', `/api/habitos/${hid}/registros/${hojeSP()}`, { status: 'talvez' })).status, 400)
  assert.equal((await bruno('PUT', `/api/habitos/${hid}/registros/${hojeSP()}`, { status: 'nao' })).status, 404)

  r = await ana('GET', `/api/pacientes/${pid}/habitos?mes=${mes}`)
  assert.equal(r.body.habitos.length, 1)
  assert.deepEqual(r.body.registros, [{ habito_id: hid, data: hojeSP(), status: 'ok' }])

  // adesão do mês aparece para a nutricionista
  r = await ana('GET', '/api/pacientes/adesao')
  assert.equal(typeof r.body[pid], 'number')

  // observações: a paciente escreve, a nutricionista lê
  assert.equal((await pac('PUT', `/api/pacientes/${pid}/observacoes?mes=${mes}`, { texto: 'Semana difícil' })).status, 200)
  assert.equal((await ana('GET', `/api/pacientes/${pid}/observacoes?mes=${mes}`)).body.texto, 'Semana difícil')

  // resumo: rascunho privado não aparece para a paciente; compartilhado aparece
  r = await ana('PUT', `/api/pacientes/${pid}/resumo?mes=${mes}`, { peso: '70,5', resumo: 'Boa evolução', compartilhado: false })
  assert.equal(r.status, 200); assert.equal(r.body.peso, 70.5)
  assert.equal((await pac('GET', `/api/pacientes/${pid}/resumo?mes=${mes}`)).body.resumo, null)
  assert.equal((await pac('PUT', `/api/pacientes/${pid}/resumo?mes=${mes}`, { resumo: 'eu mesma' })).status, 403)
  await ana('PUT', `/api/pacientes/${pid}/resumo?mes=${mes}`, { peso: 70.5, resumo: 'Boa evolução', compartilhado: true })
  r = await pac('GET', `/api/pacientes/${pid}/resumo?mes=${mes}`)
  assert.equal(r.body.resumo.resumo, 'Boa evolução'); assert.equal(r.body.observacoes, 'Semana difícil')

  // agenda
  const amanha = new Date(Date.now() + 864e5).toISOString()
  r = await ana('POST', '/api/compromissos', { titulo: 'Retorno — Maria', tipo: 'retorno', paciente_id: pid, inicio: amanha })
  assert.equal(r.status, 201); assert.equal(r.body.pacientes.nome, 'Maria Silva')
  const cid = r.body.id
  assert.equal((await bruno('POST', '/api/compromissos', { titulo: 'x', paciente_id: pid, inicio: amanha })).status, 400)
  assert.equal((await bruno('DELETE', `/api/compromissos/${cid}`)).status, 404)
  assert.equal((await pac('GET', '/api/compromissos?de=2000-01-01&ate=2100-01-01')).status, 403)
  r = await ana('GET', `/api/compromissos?de=${new Date().toISOString()}&ate=${new Date(Date.now() + 7 * 864e5).toISOString()}`)
  assert.equal(r.body.length, 1)
  r = await pac('GET', `/api/pacientes/${pid}/compromissos?futuros=1&limite=3`)
  assert.equal(r.body.length, 1)
  r = await ana('PUT', `/api/compromissos/${cid}`, { titulo: 'Retorno — Maria', tipo: 'retorno', paciente_id: pid, inicio: amanha, status: 'cancelado' })
  assert.equal(r.body.status, 'cancelado')

  // arquivar tira o acesso da paciente; reativar devolve
  await ana('PATCH', `/api/pacientes/${pid}`, { ativo: false })
  assert.equal((await pac('GET', '/api/me')).body.papel, 'novo')
  assert.equal((await pac('GET', `/api/pacientes/${pid}/habitos?mes=${mes}`)).status, 404)
  await ana('PATCH', `/api/pacientes/${pid}`, { ativo: true })
  assert.equal((await pac('GET', '/api/me')).body.papel, 'paciente')

  // excluir apaga tudo em cascata
  assert.equal((await ana('DELETE', `/api/pacientes/${pid}`)).status, 204)
  assert.equal((await ana('GET', `/api/pacientes/${pid}`)).status, 404)
})
