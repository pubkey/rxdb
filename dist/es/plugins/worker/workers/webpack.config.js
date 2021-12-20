var path = require('path');

var TerserPlugin = require('terser-webpack-plugin');

var projectRootPath = path.resolve(__dirname, '../../../../');
module.exports = {
  entry: {
    'lokijs-incremental-indexeddb': './src/plugins/worker/workers/lokijs-incremental-indexeddb.worker.ts',
    'lokijs-indexeddb': './src/plugins/worker/workers/lokijs-indexeddb.worker.ts',
    'lokijs-memory': './src/plugins/worker/workers/lokijs-memory.worker.ts',
    'lokijs-fs': './src/plugins/worker/workers/lokijs-fs.worker.ts',
    'pouchdb-idb': './src/plugins/worker/workers/pouchdb-idb.worker.ts',
    'pouchdb-memory': './src/plugins/worker/workers/pouchdb-memory.worker.ts'
  },
  output: {
    filename: '[name].worker.js',
    path: path.resolve(projectRootPath, 'dist/workers')
  },
  mode: 'production',
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(projectRootPath, 'test_tmp', 'webpack-cache')
  },
  devtool: 'source-map',
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: {
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        }
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