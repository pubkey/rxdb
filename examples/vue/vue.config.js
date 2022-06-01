module.exports = {
  configureWebpack: {
    devtool: 'source-map'
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
