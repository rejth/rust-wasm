const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');

const dist = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'production',
  performance: {
    hints: false,
  },
  entry: {
    index: './js/index.jsx',
  },
  output: {
    path: dist,
    filename: '[name].js',
  },
  devServer: {
    static: dist,
    hot: true,
  },
  experiments: {
    asyncWebAssembly: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'static' }],
    }),
    new WasmPackPlugin({
      crateDirectory: __dirname,
      extraArgs: '--target web',
    }),
  ],
};
