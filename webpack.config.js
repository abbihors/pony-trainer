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
