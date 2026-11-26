require('./env')
const express = require('express')
const cors = require('cors')
const { pool, migrate, waitForDatabase } = require('./db')
const { requireAuth } = require('./auth')
const { HttpError } = require('./util')

const app = express()
const port = Number(process.env.PORT || 3000)

app.disable('x-powered-by')
app.set('trust proxy', 1)

// CORS_ORIGIN: origens separadas por vírgula. O app Android (Capacitor) usa https://localhost.
// Vazio = qualquer origem (só para desenvolvimento).
const origens = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean)
app.use(cors(origens.length ? { origin: origens } : undefined))
app.use(express.json({ limit: '200kb' }))

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('select 1')
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'erro', error: 'Banco de dados indisponível' })
  }
})

app.use('/api/me', requireAuth, require('./routes/me'))
app.use('/api/pacientes', requireAuth, require('./routes/pacientes'))
app.use('/api/habitos', requireAuth, require('./routes/habitos'))
app.use('/api/compromissos', requireAuth, require('./routes/compromissos'))

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' })
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') return res.status(400).json({ error: 'Valor inválido' })
  if (err.code === '23514') return res.status(400).json({ error: 'Dados fora do permitido' })
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

async function start() {
  await waitForDatabase()
  await migrate()
  return app.listen(port, () => console.log(`API do AcompNutri em http://localhost:${port}`))
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Falha ao iniciar a API:', err)
    process.exit(1)
  })
}

module.exports = { app, start }
