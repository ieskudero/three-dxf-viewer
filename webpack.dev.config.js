const path = require( 'path' );
const express = require( 'express' );
const { merge } = require( 'webpack-merge' );
const webpackConfigBase = require( './webpack.base.config.js' );

const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
  
const webpackConfigDev = {
	entry: {
		main: './example/index.js',
		css: './example/index.css',
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
		} )
	],
	devServer: {
		static: './dist',
		hot: false,
		setupMiddlewares: ( middlewares, devServer ) => {

			devServer.app.use( '/fonts/', express.static( path.resolve( __dirname, './example/fonts' ) ) );	
			devServer.app.use( '/resources/', express.static( path.resolve( __dirname, './resources' ) ) );				

			return middlewares;
		},
		devMiddleware: {
			writeToDisk: true
		}
	},
	devtool: 'inline-source-map',	//inline-source-map necessary instead of source-map for chrome dev tools workspace to work
	mode: 'development'
};

module.exports = merge( webpackConfigBase, webpackConfigDev );
 