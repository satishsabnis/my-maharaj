import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mymaharaj.app',
  appName: 'my-maharaj',
  webDir: 'public',
  server: {
    url: 'https://my-maharaj.vercel.app',
    cleartext: true
  }
};

export default config;