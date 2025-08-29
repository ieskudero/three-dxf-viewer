import { DXFViewer } from '../../src/dxfViewer.js';
import { Boilerplate } from '../boilerplate.js';

import './index.css';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';

//init html
let html = new Boilerplate();
let viewer = new DXFViewer();
viewer.subscribe( 'log', ( message ) => console.log( message ) );
viewer.subscribe( 'error', ( message ) => console.error( message ) );
viewer.subscribe( 'progress', async message => await html.updateMessage( message ) );

html.onLoad = async ( file ) => {
	html.three.clear();

	let dxf = await viewer.getFromFile( file, font );

	
	if( dxf ) {
		//add dxf
		html.three.addDXF( dxf );
	}
};

html.init();
  






