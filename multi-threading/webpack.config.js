const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');

module.exports = {
  mode: 'development',
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
    // Required headers for SharedArrayBuffer (WASM threads)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      // Fix wasm-bindgen-rayon worker import path
      '../../..': path.resolve(__dirname, 'pkg/multi_threading.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-react', { runtime: 'automatic' }]],
          },
        },
      },
      {
        test: /\.wgsl$/,
        type: 'asset/source',
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'static' }],
    }),
  ],
};
