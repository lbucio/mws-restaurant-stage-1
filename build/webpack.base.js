const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const cleanOptions = {
    root: path.resolve(__dirname, '..'),
};

module.exports = {
    entry: {
        main: './src/main.js',
        restaurant_info: './src/restaurant_info.js',
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, '..', 'dist')
    },
    plugins: [
        new CleanWebpackPlugin(['dist'], cleanOptions),
    ],
    module: {
        rules: [
            {
                test: /.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    }
};

