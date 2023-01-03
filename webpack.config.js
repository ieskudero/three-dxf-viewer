
var path = require( 'path' );
const TerserPlugin = require( 'terser-webpack-plugin' );
const CaseSensitivePathsPlugin = require( 'case-sensitive-paths-webpack-plugin' );

module.exports = ( env ) => {

	return {
		entry: {
			main: './dxfViewer.js',
		},
		output: {
			path: path.resolve( __dirname, './dist' ),
			filename: '[name].js',
			library: {
				name: 'library',	//CONFICONFI also uses library, so change accordingly
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
							minimize: true
						}
					}
				},
				{ 
				   //get url when jpg
				   test: /\.jpe?g$/, 
				   type: 'asset/inline'
				},
				{
					test: /\.(svg|png|gif|ico|eot|ttf|woff|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
					type: 'asset/resource'
				},
			]
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
			]
			,
			runtimeChunk: false
		},
		plugins: [
			new CaseSensitivePathsPlugin()
		],
		stats: {
			colors: true
		},
		watch: false,
		devtool: false,
		mode: 'production'
	};
};
