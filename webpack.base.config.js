const path = require( 'path' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CaseSensitivePathsPlugin = require( 'case-sensitive-paths-webpack-plugin' );
  
module.exports = ( dev ) => {
	return {
		output: {
			path: path.resolve( __dirname, './dist' ),
			filename: '[name].js',
			library: {
				name: 'library',
				type: 'assign-properties'
			}
		},
		resolve: {
			fallback: {
				crypto: require.resolve( 'crypto-browserify' ),
				stream: require.resolve( 'stream-browserify' ),
				buffer: require.resolve( 'buffer' )
			}
		},
		target: 'web',
		module: {
			rules: [
				{
					test: /\.html$/,
					use: {
						loader: 'html-loader',
						options: {
							minimize: !dev
						}
					}
				},		
				{ /* IMPORT FOR CSS MODULES. CSS FILES THAT ARE IMPORTED FROM JS */
					test: /\.css$/,
					use: [ 'to-string-loader',{
						loader: 'css-loader',
						options: {
							importLoaders: 1,
							modules: 'global',
							sourceMap: dev
						}
					}
					],
					include: /\.module\.css$/,
				},
				{ /* IMPORT FOR CSS FILES. CSS FILES THAT ARE ADDED FROM WEBPACK & CSS FILES */
					test: /\.css$/,
					use: [ {
						loader: MiniCssExtractPlugin.loader,
						options: {}
					}, {
						loader: 'css-loader',
						options: { sourceMap: dev }
					}
					],
					exclude: /\.module\.css$/,
				},
				{ 
				//get url when jpg
					test: /\.jpe?g$/, 
					type: 'asset/inline'
				},
				{
					test: /\.(svg|png|gif|ico|eot|ttf|woff|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
					type: 'asset/resource'
				}
			]
		},
		plugins: [
			new CaseSensitivePathsPlugin()
		],
		stats: {
			colors: true
		}
	};	
};