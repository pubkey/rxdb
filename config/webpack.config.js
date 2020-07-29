const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


//console.log(process.env.NODE_ENV);
//process.exit();


const plugins = [];
if (process.env.NODE_ENV === 'disc')
    plugins.push(new BundleAnalyzerPlugin());

module.exports = {
    mode: 'production',
    entry: './dist/es/index.js',
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
        warnings: false
    }
};
