//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // VS Code extensions run in a Node.js-context
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    clean: true,
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  externals: {
    vscode: 'commonjs vscode', // The vscode-module is created on-the-fly and must be excluded
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      formatter: path.resolve(__dirname, 'src/formatter/pkg'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    // This plugin ensures the wasm file is copied to the dist folder
    new CopyPlugin({
      patterns: [
        { from: './src/formatter/pkg/formatter_bg.wasm', to: '.' }
      ],
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
  devtool: 'source-map',
};
module.exports = config;
