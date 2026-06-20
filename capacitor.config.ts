import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workpartners.app',
  appName: 'AIकर',
  webDir: 'out',
  server: {
    url: 'https://workpartners.co.in',
    cleartext: false,
  },
};

export default config;
