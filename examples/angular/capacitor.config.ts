import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'info.rxdb.example',
  appName: 'angular',
  webDir: 'dist/angular/capacitor',
  bundledWebRuntime: false,
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase'
    }
  }
};

export default config;
