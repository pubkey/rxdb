const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  lintOnSave: false,
  publicPath: './',
  configureWebpack: {
    devtool: 'source-map',
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
