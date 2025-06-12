import { resolve } from 'path';
import { defineConfig } from 'vite';

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
			entry: resolve( __dirname, 'main.js' )
			//name: '[name]',
			//fileName: '[name]',
		},
		rollupOptions: {
			output: [{
				entryFileNames: `main.js`,
				format: "es",
				globals: {
					three: "THREE",
				},
			},{
          		name: 'DXFViewerLib',
          		entryFileNames: `main.umd.cjs`,
          		format: "umd",
          		globals: {
            		three:'THREE'
					,dxf:'DXF'
				}
          	}]
        }
	},
	plugins: []
} );