const path = require('path');

/**
 * Builds the UI of the database viewer into a single JavaScript file.
 *
 * The result is not part of the rxdb bundle. `scripts/build-db-viewer.mjs`
 * inlines it into one self contained HTML file that is published with the
 * docs and loaded into an iframe by `rxdb/plugins/db-viewer`.
 */
module.exports = {
    target: 'web',
    mode: 'production',
    entry: path.resolve(__dirname, '../db-viewer/src/index.tsx'),
    devtool: false,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    /**
                     * The root babel config targets the rxdb build and would
                     * pull in @babel/runtime helpers that this page does not
                     * need, so the viewer is compiled on its own terms.
                     */
                    babelrc: false,
                    configFile: false,
                    presets: [
                        ['@babel/preset-typescript', {
                            isTSX: true,
                            allExtensions: true
                        }],
                        ['@babel/preset-env', {
                            bugfixes: true,
                            targets: {
                                edge: '107',
                                firefox: '107',
                                chrome: '108',
                                safari: '16.2'
                            }
                        }]
                    ],
                    plugins: [
                        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
                    ]
                }
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'db-viewer.js',
        path: path.resolve(__dirname, '../db-viewer/dist'),
        clean: true
    },
    performance: {
        hints: false
    }
};
