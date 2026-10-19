const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  lintOnSave: false,
  publicPath: './',
  configureWebpack: {
    devtool: 'source-map',
    resolve: {
      // use the ES2015 build of RxJS instead of the bigger ES5 build
      conditionNames: ['es2015', '...'],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          'test/multitab.html'
        ],
      }),
    ],
  },
  pages: {
    index: {
      entry: 'src/main.ts',
      title: 'RxDB - Vue 3',
    },
  },
  pwa: {
    name: 'RxDB - Vue 3',
    themeColor: '#008000',
    msTileColor: '#008000',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: '#008000',
  },
  css: {
    sourceMap: process.env.NODE_ENV !== 'production'
  }
};
