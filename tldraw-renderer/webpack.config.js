const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
    entry: './src/index.tsx',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
            // Add fallbacks for .js extensions
            'react/jsx-runtime.js': 'react/jsx-runtime',
            'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime'
        },
        // Add this part to handle resolving .mjs files
        byDependency: {
            esm: {
                fullySpecified: false,
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: {
                    loader: 'babel-loader'
                },
                exclude: /node_modules/,

            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'public',
                    filter: (resourcePath) => {
                        if (resourcePath.includes('index.html')) {
                            return true;
                        }
                        return false;
                    }
                }
            ]
        })
    ]
};