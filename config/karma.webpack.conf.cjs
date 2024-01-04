const webpack = require('webpack');


const externals = {};
[
    'path',
    'events',
    'url',
    'fs',
    'module',
    'http',
    'assert'
].forEach(k => externals['node:' + k] = '{}');

module.exports = {
    target: 'web',
    externals: externals,
    resolve: {
        fallback: {
            fs: false,
            url: false,
            path: false,
            http: false,
            https: false,
            domain: false,
            crypto: false,
            tls: false,
            net: false,
            async_hooks: false,
            zlib: false,
            child_process: false,
            os: false,
            vm: false,
            foundationdb: false,
            bufferutil: false,
            'utf-8-validate': false,
            'try-thread-sleep': false,
            express: false,
            'pouchdb-fauxton': false,
            timers: false,
            'querystring': require.resolve('querystring-es3'),

            /**
             * @link https://github.com/react-dnd/react-dnd/issues/3425#issuecomment-1214554950
             */
            'process/browser': require.resolve('process/browser')
        },
        extensions: ['.ts', '.js', '.json']
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        })
    ]
};
