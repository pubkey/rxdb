"use strict";

var path = require('path');
var TerserPlugin = require('terser-webpack-plugin');
var projectRootPath = path.resolve(__dirname, '../../../../');
var babelConfig = require('../../../../babel.config');
module.exports = {
  entry: {
    'lokijs-incremental-indexeddb': './src/plugins/storage-worker/workers/lokijs-incremental-indexeddb.worker.ts',
    'lokijs-indexeddb': './src/plugins/storage-worker/workers/lokijs-indexeddb.worker.ts',
    'lokijs-memory': './src/plugins/storage-worker/workers/lokijs-memory.worker.ts',
    'lokijs-fs': './src/plugins/storage-worker/workers/lokijs-fs.worker.ts',
    'dexie': './src/plugins/storage-worker/workers/dexie.worker.ts',
    'memory': './src/plugins/storage-worker/workers/memory.worker.ts'
  },
  output: {
    filename: '[name].worker.js',
    clean: true,
    path: path.resolve(projectRootPath, 'dist/workers')
  },
  mode: 'production',
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(projectRootPath, 'test_tmp', 'webpack-cache-worker')
  },
  devtool: 'source-map',
  module: {
    rules: [
    /**
     * We transpile the typscript via babel instead of ts-loader.
     * This ensures we have the exact same babel config
     * as the root RxDB project.
     */
    {
      test: /\.tsx?$/,
      exclude: /(node_modules)/,
      use: {
        loader: 'babel-loader',
        options: babelConfig
      }
    }]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    /**
     * Fix LokiJS bundle error
     * @link https://rxdb.info/rx-storage-lokijs.html
     */
    fallback: {
      fs: false
    }
  },
  optimization: {
    moduleIds: 'deterministic',
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false
        }
      },
      /**
       * Disable creating the license files.
       * @link https://github.com/webpack/webpack/issues/12506#issuecomment-789314176
       */
      extractComments: false
    })]
  }
};
//# sourceMappingURL=webpack.config.js.map