import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { sb } from './supabase'

/** true quando roda dentro do app Android (Capacitor). */
export const ehApp = Capacitor.isNativePlatform()

/** Endereço para onde o Google/Supabase devolve o login dentro do app. */
export const REDIRECT_APP = 'com.acompnutri.app://login-callback'

/**
 * Login Google no app: abre o navegador do sistema (o Google não permite login
 * dentro de WebView) e, ao voltar pelo deep link, troca o código pela sessão.
 */
export async function entrarGoogleNoApp() {
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT_APP, skipBrowserRedirect: true },
  })
  if (error) throw error
  await Browser.open({ url: data.url, presentationStyle: 'popover', toolbarColor: '#5f7f64' })
}

let iniciado = false
/** Liga os recursos nativos uma vez: deep link do login, botão voltar, barra de status. */
export function iniciarNativo(onVoltar: () => boolean) {
  if (!ehApp || iniciado) return
  iniciado = true

  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(REDIRECT_APP)) return
    await Browser.close().catch(() => {})
    const u = new URL(url.replace(REDIRECT_APP, 'https://x/cb'))
    const code = u.searchParams.get('code')
    const erro = u.searchParams.get('error_description')
    if (erro) { alert('Não foi possível entrar: ' + erro); return }
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (error) alert('Não foi possível entrar: ' + error.message)
    }
  })

  // botão "voltar" do Android: fecha modal / volta página; na raiz, minimiza o app
  App.addListener('backButton', ({ canGoBack }) => {
    if (onVoltar()) return
    if (canGoBack) window.history.back()
    else App.minimizeApp()
  })

  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {})
}

/** Barra de status: verde com ícones claros (login) ou branca com ícones escuros (app). */
export function barraStatus(verde: boolean) {
  if (!ehApp) return
  StatusBar.setBackgroundColor({ color: verde ? '#5f7f64' : '#ffffff' }).catch(() => {})
  StatusBar.setStyle({ style: verde ? Style.Dark : Style.Light }).catch(() => {})
}

export function esconderSplash() {
  if (ehApp) SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {})
}
