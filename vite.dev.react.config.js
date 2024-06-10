import { defineConfig } from 'vite';

import { createHtmlPlugin } from 'vite-plugin-html';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react';
import dns from 'dns'

dns.setDefaultResultOrder('verbatim');

export default defineConfig( {
	root: './example/react',
	base: '',
	server: {
		port: 9009,
		open: true
	},
	build: {
		rollupOptions: {
			input: {
				main: 'index.html',
			},
			output: {
				dir: 'dist',
				entryFileNames: '[name].jsx',
				assetFileNames: '[name].css',
				chunkFileNames: 'chunk-[name].js',
				manualChunks: undefined,
			}
		}
	},
	plugins: [
		createHtmlPlugin( {
			minify: true,
			entry: 'index.jsx',				//relative to root
			template: 'index.html',			//relative to root
			inject: {
				data: {
					title: 'index',
					injectScript: '<script src="./index.jsx"></script>',
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
		} ),
		react()
	]
} );