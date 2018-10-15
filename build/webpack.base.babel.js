/* global __dirname, module */
import path from 'path';
import CleanWebpackPlugin from 'clean-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import FileManagerPlugin from 'filemanager-webpack-plugin';

const cleanOptions = {
    root: path.resolve(__dirname, '..'),
};

module.exports = {
    entry: {
        main: './src/js/main.js',
        restaurant_info: './src/js/restaurant_info.js',
        sw: './src/sw.js'
    },
    output: {
        filename: 'js/[name].js',
        path: path.resolve(__dirname, '..', 'dist')
    },
    plugins: [
        new CleanWebpackPlugin(['dist'], cleanOptions),
        new MiniCssExtractPlugin({
            filename: 'css/styles.css'
        }),
        new FileManagerPlugin({
            onEnd: {
                copy: [
                    { source: './src/static/', destination: './dist' },
                ],
                move: [
                    { source: './dist/js/sw.js', destination: './dist/sw.js' }
                ],
            }
        })
    ],
    module: {
        rules: [
            {
                test: /.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader'
                ]
            }
        ]
    }
};

