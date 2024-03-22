const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "production",
    entry: {
        background: path.resolve(__dirname, "..", "src", "background.ts"),
        pullRequestScript: path.resolve(__dirname, "..", "src", "contentScripts", "pullRequestScript.ts"),
        inkdropCiDataReader: path.resolve(__dirname, "..", "src", "contentScripts", "inkdropCiDataReader.ts"),
        readmeScript: path.resolve(__dirname, "..", "src", "contentScripts", "readmeScript.ts"),
    },
    output: {
        path: path.join(__dirname, "../build/js"),
        publicPath: "",
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            process: "process/browser"
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: ".", to: "..", context: "public" }]
        }),
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
    ],
};