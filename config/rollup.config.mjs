import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: './config/bundle-size.js',
    output: {
        sourcemap: true,
        name: 'app',
        file: './test_tmp/rollup.bundle.js'
    },
    plugins: [
        nodeResolve(),
        commonjs({
            include: 'node_modules/**',
        })
    ]
};
