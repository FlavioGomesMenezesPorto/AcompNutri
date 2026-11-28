// Gera o APK de debug. Contorna dois problemas do Java no Windows quando o
// caminho do usuário tem acento ("Flávio"): a pasta temporária vai para C:\Users\Public.
const { execSync } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const path = require('node:path')

const tmp = 'C:/Users/Public/acompnutri-tmp'
mkdirSync(tmp, { recursive: true })

const env = {
  ...process.env,
  JAVA_TOOL_OPTIONS: `-Djdk.net.unixdomain.tmpdir=${tmp} -Djava.io.tmpdir=${tmp}`,
}

// caminho completo: alguns terminais não procuram programas na pasta atual
const android = path.join(__dirname, '..', 'android')
execSync(`"${path.join(android, 'gradlew.bat')}" assembleDebug`, { cwd: android, env, stdio: 'inherit' })
console.log('\nAPK: android/app/build/outputs/apk/debug/app-debug.apk')
