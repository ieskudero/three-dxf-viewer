const path = require( 'path' );
const fs = require( 'fs' );
const express = require( 'express' );
const { merge } = require( 'webpack-merge' );
const webpackConfigBase = require( './webpack.base.config.js' );

const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const CopyPlugin = require( 'copy-webpack-plugin' );

let entry = {};
let plugins = [];

//read all folders from ./example that is not fonts
let examples = path.resolve( __dirname, './example' );
const folders = fs.readdirSync( examples  ).filter( f => f !== 'fonts' &&  fs.lstatSync( path.join( examples, f ) ).isDirectory() );

//fill entry per folder
folders.forEach( f => { entry[`main${f}`] = `./example/${f}/index.js`; entry[`css${f}`] = `./example/${f}/index.css`; } );

//fill plugins per folder
folders.forEach( f => plugins.push( new HtmlWebPackPlugin( {
	template: `./example/${f}/index.html`,
	filename: `./${f}/index.html`,
	chunks: [ `main${f}`, `css${f}` ]
} ) ) );


const webpackConfigDev = {
	entry: entry,
	plugins: plugins.concat( [
		new MiniCssExtractPlugin( {
			filename: '[name].css',
			chunkFilename: '[id].css'
		} ),
		new CopyPlugin( {
			patterns: [
				{ from: 'example/fonts', to: 'fonts' },
			],
		} )
	] ),
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

module.exports = merge( webpackConfigBase( true ), webpackConfigDev );
 