const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'polyfills': './app/polyfills.ts',
        'vendor': './app/vendor.ts',
        'app': './app/bootstrap.ts'
    },
    module: {
        loaders: [{
            test: /\.ts?$/,
            loaders: ['awesome-typescript-loader?useWebpackText=true', 'angular2-template-loader'],
        }, {
            test: /\.html?$/,
            loaders: ['raw-loader'],
        }, {
            test: /\.css$/,
            loader: ['style-loader', 'css-loader?-url']

        }, {
            test: /\.less$/,
            loader: ['style-loader', 'css-loader', 'less-loader']
        }, {
            test: /\.json$/,
            loader: 'json-loader'
        }]
    },

    output: {
        filename: '[name].[hash].bundle.js',
        sourceMapFilename: '[name].[hash].bundle.map',
        path: path.join(__dirname, 'dist'),
        publicPath: '/'
    },
    plugins: [
        /*
         * @link https://github.com/ansman/validate.js/issues/12#issuecomment-71919930
         * TODO maybe remove ContextReplacementPlugin in the next angular version
         */
        new webpack.ContextReplacementPlugin(
            /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
            __dirname
        ),
        new webpack.optimize.CommonsChunkPlugin({
            name: ['app', 'vendor', 'polyfills']
        }),
        new webpack.ProgressPlugin({}),
        new HtmlWebpackPlugin({
            template: 'app/index.html',
            chunksSortMode: 'dependency'
        })
    ],
    resolve: {
        extensions: ['.js', '.ts']
    },
    node: {
        fs: 'empty'
    }
};
