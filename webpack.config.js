const path = require('path');
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        main: './src/index.js',
        recorder: './src/sample-recorder.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    // watch: true,
    plugins: [
        // Fix undefined errors
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new CopyPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets' },
            ],
        }),
    ],
    resolve: {
        fallback: {
            'path': false,
            'fs': false,
        }
    }
};
