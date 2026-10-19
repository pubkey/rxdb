import { defineConfig, defaultClientConditions } from 'vite';

export default defineConfig({
    resolve: {
        /**
         * Without the 'es2015' condition, Vite resolves
         * the ES5 build of RxJS which is bigger.
         */
        conditions: ['es2015', ...defaultClientConditions]
    }
});
