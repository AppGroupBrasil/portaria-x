import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.portariax.app',
  appName: 'Portaria X',
  webDir: 'dist',
  server: {
    // O app carrega o frontend direto do servidor, assim ajustes de UI publicados
    // em portariax.com.br chegam ao app sem precisar republicar no Google Play.
    // Requer conexão: sem internet o WebView não abre (não há fallback offline).
    url: 'https://portariax.com.br',
    androidScheme: 'https',
    // Navegação permitida dentro do WebView (mesmo domínio e subdomínios).
    allowNavigation: ['portariax.com.br', '*.portariax.com.br'],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Keyboard behavior
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    // Push Notifications (Firebase Cloud Messaging)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
