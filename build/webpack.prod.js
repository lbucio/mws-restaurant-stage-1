const webpack = require('webpack');
const merge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const base = require('./webpack.base.js');

module.exports = merge(base, {
    mode: 'production',
    optimization: {
        minimizer: [new UglifyJsPlugin()]
    }
});