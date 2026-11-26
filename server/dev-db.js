// Banco PostgreSQL EMBUTIDO para desenvolvimento, sem Docker (PGlite).
// Os dados ficam em server/.pgdata. Atende 1 conexão por vez, então rode a API
// com DATABASE_POOL_MAX=1 (o "npm run dev:local" já faz isso).
// Em produção use um Postgres de verdade (Docker, Neon, Render, Railway…).
const path = require('path')

const PORTA = Number(process.env.DEV_DB_PORT || 5434)

;(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
  const db = await PGlite.create(path.join(__dirname, '.pgdata'))
  const server = new PGLiteSocketServer({ db, port: PORTA, host: '127.0.0.1' })
  await server.start()
  console.log(`Banco embutido em postgres://postgres@127.0.0.1:${PORTA}/postgres (dados em server/.pgdata)`)
  const parar = async () => { await server.stop(); await db.close(); process.exit(0) }
  process.on('SIGINT', parar)
  process.on('SIGTERM', parar)
})()
