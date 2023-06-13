import { defineConfig } from 'vite';

import { createHtmlPlugin } from 'vite-plugin-html';
import { viteStaticCopy } from 'vite-plugin-static-copy';


export default defineConfig( {
	root: './example/layer',
	base: '/',
	server: {
		port: 9009,
		open: true,
	},
	build: {
		rollupOptions: {
			input: {
				main: 'index.html',
			},
			output: {
				dir: 'dist',
				entryFileNames: '[name].js',
				assetFileNames: '[name].css',
				chunkFileNames: 'chunk-[name].js',
				manualChunks: undefined,
			}
		}
	},
	plugins: [
		createHtmlPlugin( {
			minify: true,
			entry: 'index.js',				//relative to root
			template: 'index.html',			//relative to root
			inject: {
				data: {
					title: 'index',
					injectScript: '<script src="./index.js"></script>',
				}
			},
		} ),
		viteStaticCopy( {
			targets: [
				{
					src: '../fonts/helvetiker_regular.typeface.json',	//RELATIVE TO ROOT
					dest: 'fonts'
				}
			]
		} )
	]
} );