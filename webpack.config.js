// eslint-disable-next-line @typescript-eslint/no-require-imports
const TerserPlugin = require("terser-webpack-plugin")

module.exports = {
  mode: "production",
  target: "node",
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false,
          compress: false,
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  output: {
    filename: "gammaray.js",
  },
}
