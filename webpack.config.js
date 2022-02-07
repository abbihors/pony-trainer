const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack')

module.exports = {
    mode: 'development',
    entry: {
        main: './src/app/index.js',
        recorder: './src/app/sample-recorder.js',
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
                { from: 'src/index.html', to: '.' },
                { from: 'src/sample-recorder.html', to: '.' },
                { from: 'src/styles.css', to: '.' },
                { from: 'src/favicon.ico', to: '.' },
            ],
        }),
    ],
    resolve: {
        fallback: {
            'path': false,
            'fs': false,
        },
        alias: {
            '@tensorflow/tfjs$':
                path.resolve(__dirname, './src/custom_tfjs/custom_tfjs.js'),
            '@tensorflow/tfjs-core$': path.resolve(
                __dirname, './src/custom_tfjs/custom_tfjs_core.js'),
            '@tensorflow/tfjs-core/dist/ops/ops_for_converter': path.resolve(
                __dirname, './src/custom_tfjs/custom_ops_for_converter.js'),
        }
    }
};
