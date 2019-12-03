import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: './dist/es/index.js',
    output: {
        sourcemap: true,
        format: 'iife',
        name: 'app',
        file: './test_tmp/rollup.bundle.js'
    },
    plugins: [
        resolve(),
        commonjs({
            include: 'node_modules/**',
        })
    ]
};
