const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


/**
 * Throw on bailouts.
 * If a dependency is causing a bailout,
 * it must be replaced!
 */
const oldConsoleLog = console.log.bind(console);
console.log = function (m1, m2, m3) {
    if (m1.includes('not an ECMAScript module')) {
        oldConsoleLog(m1);
        throw new Error('ERROR: A dependency of RxDB is causing an optimization bailout. This is not allowed.');
    } else {
        return oldConsoleLog(m1, m2, m3);
    }
};


const plugins = [];
if (process.env.NODE_ENV === 'disc')
    plugins.push(new BundleAnalyzerPlugin());

module.exports = {
    mode: 'production',
    entry: './config/bundle-size.js',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin()
        ]
    },
    plugins,
    output: {
        path: path.resolve(__dirname, '../test_tmp'),
        filename: 'webpack.bundle.js'
    },
    stats: {
        /**
         * @link https://webpack.js.org/plugins/module-concatenation-plugin/#debugging-optimization-bailouts
         */
        optimizationBailout: true,
        warnings: true
    }
};
