import { DXFViewer } from '../../src/dxfViewer.js';
import { Boilerplate } from '../boilerplate.js';
import { Select } from '../../src/utils/select.js';

import './index.css';

//global variables
let html = new Boilerplate();
const font = 'fonts/helvetiker_regular.typeface.json';
const viewer = new DXFViewer();
viewer.subscribe( 'log', ( message ) => console.log( message ) );
viewer.subscribe( 'error', ( message ) => console.error( message ) );
viewer.subscribe( 'progress', async message => await html.updateMessage( message ) );

//init html
html.onLoad = async ( file ) => {
	html.three.clear();

	let dxf = await viewer.getFromFile( file, font );
	if( dxf ) {
		
		const select = new Select( html.three.renderer.domElement, html.three.camera, dxf, viewer.lastDXF );
		select.subscribe( 'select', ( selects ) => console.log( 'Selected entities', selects ) );

		html.three.scene.add( dxf );
		html.three.centerCamera();
	}
};

html.init();
  






