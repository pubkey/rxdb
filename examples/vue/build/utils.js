'use strict'
const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const config = require('./config')

const _ = module.exports = {}

_.cwd = (file) => {
  return path.join(process.cwd(), file || '')
}

_.cssLoader = config.cssModules ?
  'css-loader?-autoprefixer&modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]' :
  'css-loader?-autoprefixer'

_.cssProcessors = [
  {loader: '', test: /\.css$/},
  {loader: 'sass-loader?sourceMap', test: /\.scss$/},
  {loader: 'less-loader?sourceMap', test: /\.less$/},
  {loader: 'stylus-loader?sourceMap', test: /\.styl$/},
  {loader: 'sass-loader?indentedSyntax&sourceMap', test: /\.sass$/},
]

_.outputPath = config.electron ?
  path.join(__dirname, '../app/dist') :
  path.join(__dirname, '../dist')

_.outputIndexPath = config.electron ?
  path.join(__dirname, '../app/dist/index.html') :
  path.join(__dirname, '../dist/index.html')

_.target = config.electron ?
  'electron-renderer' :
  'web'

// https://github.com/egoist/vbuild/blob/master/lib/vue-loaders.js
_.loadersOptions = () => {
  const isProd = process.env.NODE_ENV === 'production'

  function generateLoader(langs) {
    langs.unshift('css-loader?sourceMap&-autoprefixer')
    if (!isProd) {
      return ['vue-style-loader'].concat(langs).join('!')
    }
    return ExtractTextPlugin.extract({
      fallback: 'vue-style-loader',
      use: langs.join('!')
    })
  }

  return {
    minimize: isProd,
    options: {
      // css-loader relies on context
      context: process.cwd(),
      // postcss plugins apply to .css files
      postcss: config.postcss,
      babel: config.babel,
      vue: {
        // postcss plugins apply to css in .vue files
        postcss: config.postcss,
        loaders: {
          css: generateLoader([]),
          sass: generateLoader(['sass-loader?indentedSyntax&sourceMap']),
          scss: generateLoader(['sass-loader?sourceMap']),
          less: generateLoader(['less-loader?sourceMap']),
          stylus: generateLoader(['stylus-loader?sourceMap']),
          js: 'babel-loader'
        }
      }
    }
  }
}
