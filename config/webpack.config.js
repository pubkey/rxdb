const webpack = require('webpack');
const path = require('path');

module.exports = {
    context: __dirname,
    entry: '../src/browserify.index.js',
    output: {
        path: path.join(__dirname, '../dist'),
        filename: 'rxdb.webpack.js',
        libraryTarget: 'var'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel-loader'
        }]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                screw_ie8: true,
                conditionals: true,
                unused: true,
                comparisons: true,
                sequences: true,
                dead_code: true,
                evaluate: true,
                join_vars: true,
                if_return: true
            },
            output: {
                comments: false
            }
        }),
    ]
};
