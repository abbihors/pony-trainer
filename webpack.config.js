const path = require('path');
const webpack = require('webpack')

module.exports = {
    mode: 'development',
    entry: './src/spectrogram2.js',
    output: {
        filename: 'main.js',
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
    ],
    resolve: {
        fallback: {
            "path": false,
            "fs": false,
        }
    }
};
