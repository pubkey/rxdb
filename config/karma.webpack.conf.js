const webpack = require('webpack');
module.exports = {
    target: 'web',
    resolve: {
        fallback: {
            fs: false,
            path: false,
            http: false,
            https: false,
            domain: false,
            crypto: false,
            tls: false,
            net: false,
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
            timers: false
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
