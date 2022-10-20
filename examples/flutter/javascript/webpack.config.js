const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
    },
    optimization: {
        minimize: false
    },
    resolve: {
        fallback: {
            fs: false
        }
    }
};
