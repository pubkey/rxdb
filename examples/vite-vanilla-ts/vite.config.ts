import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    // required to support top level await
    topLevelAwait()
  ]
});
