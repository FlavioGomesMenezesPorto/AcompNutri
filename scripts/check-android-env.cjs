// Antes de empacotar o app Android: confere se o endereço da API foi definido.
// (no celular não existe "mesmo domínio", então VITE_API_URL é obrigatório)
const fs = require('node:fs')
const path = require('node:path')

const arquivo = path.join(__dirname, '..', '.env.android')
const conteudo = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : ''
const url = (/^\s*VITE_API_URL\s*=\s*(\S+)/m.exec(conteudo) || [])[1] || process.env.VITE_API_URL

if (!url) {
  console.error('\n✗ Falta o endereço da API para o app Android.')
  console.error('  Copie .env.android.example para .env.android e preencha VITE_API_URL.\n')
  process.exit(1)
}
if (url.startsWith('http://') && process.env.CAP_ALLOW_HTTP !== 'true') {
  console.error(`\n✗ ${url} é HTTP. O Android bloqueia HTTP por padrão.`)
  console.error('  Use HTTPS, ou (só para teste na rede de casa) defina CAP_ALLOW_HTTP=true.\n')
  process.exit(1)
}
console.log(`✓ App Android vai usar a API em ${url}`)
