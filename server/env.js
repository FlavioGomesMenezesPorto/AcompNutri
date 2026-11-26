// Carrega server/.env e depois o .env da raiz do projeto (o primeiro vence).
const path = require('path')

require('dotenv').config({
  path: [path.resolve(__dirname, '.env'), path.resolve(__dirname, '../.env')],
  quiet: true,
})
