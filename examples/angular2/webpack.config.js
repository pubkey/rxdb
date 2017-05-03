const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const path = require('path');
const commonConfig = require('./webpack.config.common.js');
const AppCachePlugin = require('appcache-webpack-plugin');

module.exports = function(options) {
    const ENV = options.ENV || 'production';

    return webpackMerge(commonConfig, {
        plugins: [
            // new webpack.optimize.DedupePlugin(),
            new webpack.DefinePlugin({
                'ENV': JSON.stringify(ENV)
            }),
            new webpack.NoEmitOnErrorsPlugin(),
            new webpack.optimize.UglifyJsPlugin({
                beautify: false,
                mangle: {
                    screw_ie8: true,
                    keep_fnames: false
                },
                compress: {
                    screw_ie8: true,
                    warnings: false
                },
                comments: false
            }),
            new AppCachePlugin({
                exclude: ['app.js', 'styles.css'],
                output: 'app.appcache'
            })
        ]
    });
};
