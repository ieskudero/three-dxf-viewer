import { defineConfig } from 'vite';

import { viteStaticCopy } from 'vite-plugin-static-copy';
import dns from 'dns'
import vue from '@vitejs/plugin-vue'

dns.setDefaultResultOrder('verbatim');

export default defineConfig( {
	root: './example/vue',
	base: '',
	server: {
		port: 9010,
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
		viteStaticCopy( {
			targets: [
				{
					src: '../fonts/helvetiker_regular.typeface.json',	//RELATIVE TO ROOT
					dest: 'fonts'
				}
			]
		} ),
		vue()
	]
} );