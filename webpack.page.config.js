const { merge } = require( 'webpack-merge' );
const webpackConfigBase = require( './webpack.base.config.js' );

const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const TerserPlugin = require( 'terser-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CopyPlugin = require( 'copy-webpack-plugin' );

const webpackConfigDev = {
	entry: {
		main: './example/index.js',
		css: './example/index.css',
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
	plugins: [
		new HtmlWebPackPlugin( {
			template: './example/index.html',
			filename: './index.html',
			chunks: [ 'main', 'css' ]
		} ),
		new MiniCssExtractPlugin( {
			filename: '[name].css',
			chunkFilename: '[id].css'
		} ),
		new CopyPlugin( {
			patterns: [
				{ from: 'example/fonts', to: 'fonts' },
			],
		} )
	],
	watch: false,
	devtool: false,
	mode: 'production'
};
 
module.exports = merge( webpackConfigBase( false ), webpackConfigDev );