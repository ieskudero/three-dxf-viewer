import { defineConfig } from 'vite';

import { createHtmlPlugin } from 'vite-plugin-html';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// THIS IS A METHOD TO RETURN A JSON WITH ALL THE DEPENDENCIES
import { dependencies } from './package.json';
function renderChunks( deps ) {
	let chunks = {};
	Object.keys( deps ).forEach( ( key ) => chunks[key] = [ key ] );
	return chunks;
}

export default defineConfig( {
	root: './example/layer',
	base: '/',
	build: {
		outDir: './dist',
		assetsDir: './dist',
		sourcemap: false,
		rollupOptions: {
			output: {
				dir: 'dist',
				entryFileNames: '[name].js',
				assetFileNames: '[name].css',
				chunkFileNames: '[name].js',
				inlineDynamicImports: false,
				manualChunks: renderChunks( dependencies )
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