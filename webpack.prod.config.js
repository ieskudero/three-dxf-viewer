const { merge } = require( 'webpack-merge' );
const webpackConfigBase = require( './webpack.base.config.js' );

const TerserPlugin = require( 'terser-webpack-plugin' );

const webpackConfigDev = {
	entry: {
		main: './main.js',
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin( {
				terserOptions: {
					output: {
						comments: /@license/i
					},
					warnings: true
				},
				extractComments: true,
				parallel: true
			} )
		],
		runtimeChunk: false,
		splitChunks: {
			maxSize: 200000,
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendor',
					chunks: 'all'
				}
			}
		}
	},
	watch: false,
	devtool: false,
	mode: 'production'
};

module.exports = merge( webpackConfigBase( false ), webpackConfigDev );