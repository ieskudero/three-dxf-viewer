/* eslint-disable no-undef */

const fs = require('fs');
const path = require('path');
const jsdoc2md = require('jsdoc-to-markdown');

class Doc {
  constructor() {
  }

  documentFile( folder, file ) {
    
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    /* get template data */
    const templateData = jsdoc2md.getTemplateDataSync({ files: file })

    /* reduce templateData to an array of class names */
    const classNames = templateData.reduce((classNames, identifier) => {
      if (identifier.kind === 'class') classNames.push(identifier.name);
      return classNames;
    }, []);

    /* create a documentation file for each class */
    for (const className of classNames) {
      const template = `{{#class name="${className}"}}{{>docs}}{{/class}}`;
      console.log(`rendering ${className}, template: ${template}`);
      const output = jsdoc2md.renderSync({ data: templateData, template: template });
      fs.writeFileSync(path.resolve(folder, `${className}.md`), output);
    }
  }

  async documentFiles( inFolder, outFolder, recursive = false ) {
    const files = await fs.promises.readdir( inFolder );
    for( let file of files ) {
        if( recursive && fs.lstatSync( path.join( inFolder, file ) ).isDirectory() ) {
            let newInFolder = path.join( inFolder, file );
            let newOutFolder = path.join( outFolder, file );
            if (!fs.existsSync(newOutFolder)) fs.mkdirSync(newOutFolder);
            await this.documentFiles( newInFolder, newOutFolder, recursive );
        }
        else doc.documentFile ( outFolder, path.join( inFolder, file ) );
    }
  }
}

const outputDir = __dirname + '/api';

let doc = new Doc();

//create main file documentation
doc.documentFile ( outputDir, __dirname + '/dxfViewer.js' );

(async () => {
  await doc.documentFiles( __dirname + '/src', outputDir, true);
})();