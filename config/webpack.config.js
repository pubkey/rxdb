var webpack = require("webpack");

module.exports = {
    context: __dirname,
    entry: './src/index.js',
    output: {
        path: __dirname + "/dist",
        filename: "rxdb.webpack.js",
        libraryTarget: "var"
    },
    module: {
        loaders: [{
            test: /\.json$/,
            loader: "json-loader"
        }, {
            test: /\.js$/,
            loader: "babel-loader"
        }]
    }
};
