// Valida o token de login do Supabase (Authorization: Bearer <access_token>)
// e garante que o usuário exista na tabela "usuarios".
//
// Projetos novos do Supabase assinam com chaves assimétricas (JWKS público);
// projetos antigos usam um segredo HS256 ("JWT Secret"). Os dois funcionam:
//   SUPABASE_URL        → usa https://<projeto>.supabase.co/auth/v1/.well-known/jwks.json
//   SUPABASE_JWT_SECRET → (opcional) aceita também tokens HS256
const { one } = require('./db')

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''

if (!SUPABASE_URL) throw new Error('SUPABASE_URL não definida. Veja server/.env.example.')

const ISSUER = `${SUPABASE_URL}/auth/v1`
let jose, jwks
async function carregarJose() {
  if (!jose) {
    jose = await import('jose')
    jwks = jose.createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`))
  }
  return jose
}

async function verificarToken(token) {
  const j = await carregarJose()
  const { alg } = j.decodeProtectedHeader(token)
  const opcoes = { issuer: ISSUER, audience: 'authenticated' }
  if (alg === 'HS256') {
    if (!JWT_SECRET) throw new Error('Token HS256 recebido mas SUPABASE_JWT_SECRET não está definido.')
    return (await j.jwtVerify(token, new TextEncoder().encode(JWT_SECRET), opcoes)).payload
  }
  return (await j.jwtVerify(token, jwks, opcoes)).payload
}

// cache curto para não gravar "ultimo_acesso" a cada requisição
const vistos = new Map()

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Não autenticado' })

  let payload
  try {
    payload = await verificarToken(token)
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('Token recusado:', err.code || err.message)
    return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' })
  }
  if (!payload.sub || !payload.email) return res.status(401).json({ error: 'Token sem usuário' })

  const meta = payload.user_metadata || {}
  req.user = {
    id: payload.sub,
    email: String(payload.email).toLowerCase(),
    nome: meta.full_name || meta.name || null,
    avatar_url: meta.avatar_url || meta.picture || null,
  }

  const ultimo = vistos.get(req.user.id)
  if (!ultimo || Date.now() - ultimo > 5 * 60_000) {
    await one(
      `insert into usuarios (id, email, nome, avatar_url) values ($1, $2, $3, $4)
       on conflict (id) do update set email = excluded.email, nome = coalesce(excluded.nome, usuarios.nome),
         avatar_url = coalesce(excluded.avatar_url, usuarios.avatar_url), ultimo_acesso = now()`,
      [req.user.id, req.user.email, req.user.nome, req.user.avatar_url],
    )
    vistos.set(req.user.id, Date.now())
  }
  next()
}

module.exports = { requireAuth, verificarToken }
