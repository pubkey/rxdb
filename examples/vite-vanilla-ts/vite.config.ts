import { defineConfig } from 'vite';

export default defineConfig({
    esbuild: {
        supported: {
            'top-level-await': true
        },
    },
});
