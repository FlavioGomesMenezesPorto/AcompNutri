const fs = require('fs')
const path = require('path')
const { Pool, types } = require('pg')

// date → 'yyyy-MM-dd' (sem conversão de fuso); numeric → número
types.setTypeParser(1082, (v) => v)
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Veja server/.env.example.')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // bancos gerenciados (Neon, Render, Railway, Supabase…) exigem SSL
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
})

const query = (text, params) => pool.query(text, params)
const one = async (text, params) => (await pool.query(text, params)).rows[0] ?? null
const many = async (text, params) => (await pool.query(text, params)).rows

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql)
}

async function waitForDatabase(tentativas = 15, intervalo = 2000) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('select 1')
      return
    } catch (err) {
      if (i >= tentativas) throw err
      console.log(`Aguardando o banco de dados (${i}/${tentativas})…`)
      await new Promise((r) => setTimeout(r, intervalo))
    }
  }
}

module.exports = { pool, query, one, many, migrate, waitForDatabase }
