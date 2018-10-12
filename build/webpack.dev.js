const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');
const base = require('./webpack.base.js');

module.exports = merge(base, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.join(__dirname, "../"),
        compress: true,
        port: 8000,
        hot: true
    },
    plugins: [
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin()
    ]
});