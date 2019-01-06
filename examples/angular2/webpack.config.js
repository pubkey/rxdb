const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.config.common.js');
const AppCachePlugin = require('appcache-webpack-plugin');

const doUglify = true;

module.exports = function(options) {
    const ENV = options.ENV || 'production';

    const plugins = [];
    plugins.push(new webpack.DefinePlugin({
        'ENV': JSON.stringify(ENV)
    }));
    plugins.push(new webpack.NoEmitOnErrorsPlugin());

    plugins.push(new AppCachePlugin({
        exclude: ['app.js', 'styles.css'],
        output: 'app.appcache'
    }));

    return webpackMerge(commonConfig, {
        plugins,
        optimization: {
            minimize: doUglify
        },
        mode: ENV
    });
};
