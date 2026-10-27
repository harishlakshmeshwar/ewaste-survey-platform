import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'edu.msrit.ewastesurvey',
  appName: 'MSRIT E-Waste Survey',
  webDir: 'dist',
  // The app talks to the same Express API the website uses; point the Android
  // build at a deployed HTTPS instance (never embed secrets here).
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#16a34a',
    },
  },
}

export default config
