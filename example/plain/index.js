import { DXFViewer } from '../../src/dxfViewer.js';
import { Boilerplate } from '../boilerplate.js';

import './index.css';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';

//init html
let html = new Boilerplate();
html.onLoad = async ( file ) => {
	html.three.clear();

	let dxf = await new DXFViewer().getFromFile( file, font );
	
	if( dxf ) {
		//add dxf
		html.three.addDXF( dxf );
	}
};

html.init();
  






