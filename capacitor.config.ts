import type { CapacitorConfig } from '@capacitor/cli'

// Só para testar com a API em http:// na rede local (nunca em produção).
const permitirHttp = process.env.CAP_ALLOW_HTTP === 'true'

const config: CapacitorConfig = {
  appId: 'com.acompnutri.app',
  appName: 'AcompNutri',
  webDir: 'dist',
  ...(permitirHttp ? { server: { cleartext: true }, android: { allowMixedContent: true } } : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false, // o app esconde quando terminar de carregar a sessão
      backgroundColor: '#5f7f64',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      backgroundColor: '#ffffff',
      style: 'LIGHT',
      overlaysWebView: false,
    },
  },
}

export default config
