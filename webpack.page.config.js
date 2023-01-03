/* eslint-disable no-undef */

var path = require( 'path' );
const express = require( 'express' );
 
const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const TerserPlugin = require( 'terser-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CaseSensitivePathsPlugin = require( 'case-sensitive-paths-webpack-plugin' );
const CopyPlugin = require("copy-webpack-plugin");

module.exports = ( env ) => {
 
	 return {
		 entry: {
			 main: './example/index.js',
		 },
		 output: {
			 path: path.resolve( __dirname, './dist' ),
			 filename: 'main.js',
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
							 minimize: true
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
								 sourceMap: false
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
							 options: { sourceMap: false }
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
			 new HtmlWebPackPlugin( {
				 template: './example/index.html',
				 filename: './index.html',
				 chunks: [ 'main', 'css' ]
			 } ),
			 new MiniCssExtractPlugin( {
				 filename: '[name].css',
				 chunkFilename: '[id].css'
			 } ),
			 new CopyPlugin({
				patterns: [
				  { from: "example/fonts", to: "fonts" },
				],
			  }),
			 new CaseSensitivePathsPlugin()
		 ],
		 watch: false,
		 devtool: false,
		 mode: 'production'
	 };
};
 