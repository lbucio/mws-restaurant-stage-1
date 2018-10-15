/* global __dirname, module */
import webpack from 'webpack';
import merge from 'webpack-merge';
import path from 'path';
import base from './webpack.base.babel.js';

module.exports = merge(base, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.join(__dirname, '../'),
        compress: true,
        port: 8000,
        hot: true
    },
    plugins: [
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin()
    ]
});