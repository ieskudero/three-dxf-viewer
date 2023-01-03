/* eslint-disable no-undef */

 var path = require('path');
 const express = require('express');
 
 const HtmlWebPackPlugin = require('html-webpack-plugin');
 const MiniCssExtractPlugin = require('mini-css-extract-plugin');
 const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
  
 module.exports = (env) => {
 
	 return {
		 entry: {
			 main: './example/index.js',
		 },
		 output: {
			 path: path.resolve(__dirname, './dist'),
			 filename: '[name].js',
			 library: {
				 name: 'library',
				 type: "assign-properties"
			 }
		 },
		 resolve: {
			 fallback: {
				 crypto: require.resolve('crypto-browserify'),
				 stream: require.resolve('stream-browserify'),
				 buffer: require.resolve('buffer')
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
							 minimize: false
						 }
					 }
				 },		
				 { /* IMPORT FOR CSS MODULES. CSS FILES THAT ARE IMPORTED FROM JS */
					 test: /\.css$/,
					 use: [ "to-string-loader",{
							 loader: 'css-loader',
							 options: {
								 importLoaders: 1,
								 modules: "global",
								 sourceMap: true
							 }
						 }
					 ],
					 include: /\.module\.css$/,
				   },
				 { /* IMPORT FOR CSS FILES. CSS FILES THAT ARE ADDED FROM WEBPACK & CSS FILES */
					 test: /\.css$/,
					 use: [{
							 loader: MiniCssExtractPlugin.loader,
							 options: {}
						 }, {
							 loader: 'css-loader',
							 options: { sourceMap: true }
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
			 new HtmlWebPackPlugin({
				 template: './example/index.html',
				 filename: './index.html',
				 chunks: ['main', 'css']
			 }),
			 new MiniCssExtractPlugin({
				 filename: '[name].css',
				 chunkFilename: '[id].css'
			 }),
			 new CaseSensitivePathsPlugin()
		 ],
		 stats: {
			 colors: true
		 },
		 devServer: {
			static: './dist',
			hot: false,
			//MAPPING local wwwdata for webpack-dev-server
			setupMiddlewares: (middlewares, devServer) => {

				devServer.app.use('/fonts/', express.static(path.resolve(__dirname, './example/fonts')));	
				devServer.app.use('/resources/', express.static(path.resolve(__dirname, './resources')));				

				return middlewares;
			},
			devMiddleware: {
				writeToDisk: true
			}
		},
		 devtool: 'inline-source-map',	//inline-source-map necessary instead of source-map for chrome dev tools workspace to work
		 mode: 'development'
	 };
 };
 