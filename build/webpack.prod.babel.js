/* global module */
import merge from 'webpack-merge';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import base from './webpack.base.babel.js';

module.exports = merge(base, {
    mode: 'production',
    optimization: {
        minimizer: [new UglifyJsPlugin()]
    }
});