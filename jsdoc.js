const fs = require( 'fs' );
const path = require( 'path' );
const jsdoc2md = require( 'jsdoc-to-markdown' );

class Doc {
	constructor() {
	}

	documentFile( folder, file ) {
    
		if ( !fs.existsSync( folder ) ) fs.mkdirSync( folder );

		/* get template data */
		const templateData = jsdoc2md.getTemplateDataSync( { files: file } );

		const jsdoc = ( type ) => {

			/* reduce templateData to an array of class names */
			const names = templateData.reduce( ( names, identifier ) => {
				if ( identifier.kind === type ) names.push( identifier.name );
				return names;
			}, [] );

			/* create a documentation file for each module */
			for ( const name of names ) {
				const template = `{{#${type} name="${name}"}}{{>docs}}{{/${type}}}`;
				console.log( `rendering ${name}, template: ${template}` );
				const output = jsdoc2md.renderSync( { data: templateData, template: template } );
				fs.writeFileSync( path.resolve( folder, `${name}.md` ), output );
			}
		};

		jsdoc( 'module' );
		jsdoc( 'class' );
	}

	async documentFiles( inFolder, outFolder, recursive = false ) {
		const files = await fs.promises.readdir( inFolder );
		for( let file of files ) {
			if( recursive && fs.lstatSync( path.join( inFolder, file ) ).isDirectory() ) {
				let newInFolder = path.join( inFolder, file );
				let newOutFolder = path.join( outFolder, file );
				if ( !fs.existsSync( newOutFolder ) ) fs.mkdirSync( newOutFolder );
				await this.documentFiles( newInFolder, newOutFolder, recursive );
			}
			else doc.documentFile ( outFolder, path.join( inFolder, file ) );
		}
	}
}

const outputDir = __dirname + '/api';

let doc = new Doc();

//create main file documentation
doc.documentFile ( outputDir, __dirname + '/main.js' );

( async () => {
	await doc.documentFiles( __dirname + '/src', outputDir, true );
} )();