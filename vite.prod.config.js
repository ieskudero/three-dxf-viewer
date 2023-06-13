import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// THIS IS A METHOD TO RETURN A JSON WITH ALL THE DEPENDENCIES
import { dependencies } from './package.json';
function renderChunks( deps ) {
	let chunks = {};
	Object.keys( deps ).forEach( ( key ) => chunks[key] = [ key ] );
	return chunks;
}

export default defineConfig( {
	root: './',
	base: '/',
	publicDir: 'public',
	build: {
		target: 'modules',
		outDir: './dist',
		assetsDir: './dist',
		sourcemap: false,
		lib: {
			entry: resolve( __dirname, 'main.js' ),
			name: '[name]',
		}
	},
	rollupOptions: {
		output: {
			//THIS SHOULD GENERATE A CHUNK PER DEPENDENCY
			manualChunks: renderChunks( dependencies ),
		},
	},
	plugins: [
		viteStaticCopy( {
			targets: [
				{
					src: './example/fonts/helvetiker_regular.typeface.json',
					dest: 'fonts'
				}
			]
		} ),
	]
} );