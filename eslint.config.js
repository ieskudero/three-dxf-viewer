import globals from 'globals';
import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import react from 'eslint-plugin-react';

export default [
	{
		ignores: [
			'dist/*',
			'api/*',
			'node_modules/*',
			'.npm/*',
			'**/package-lock.json',
			'**/jsdoc.js',
			'**/vite.prod.config.js'
		]
	},
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				myCustomGlobal: 'readonly'
			},
			parser: babelParser,
			parserOptions: {
                requireConfigFile: false,
				babelOptions: {
					presets: [ '@babel/preset-react' ]
				}
			}
		},
		plugins : {
            react: react
        },
		rules: {
			'indent': [ 'error', 'tab' ],
			'linebreak-style': [ 'error', 'windows' ],
			'quotes': [ 'error', 'single' ],
			'semi': [ 'error', 'always' ],
			'no-async-promise-executor': 'off',        
			'space-in-parens': [ 'error', 'always' ],
			'object-curly-spacing': [ 'error', 'always' ],
			'array-bracket-spacing': [ 'error', 'always' ],
			'react/jsx-uses-react': 'error',   
     		'react/jsx-uses-vars': 'error' 
		},
		files: [ 'src/**/*.js', 'src/**/*.jsx','example/**/*.js', 'example/**/*.jsx' ]
	}
];
