import { DXFViewer } from '../../src/dxfViewer.js';
import { Boilerplate } from '../boilerplate.js';
import GUI from 'lil-gui';
import { Hover } from '../../src/utils/hover.js';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
const viewer = new DXFViewer();
let gui;

//init html
let html = new Boilerplate();
html.onLoad = async ( file ) => {
	if( gui ) gui.destroy();
	gui = new GUI( { width: 310 } );
	html.three.clear();

	let dxf = await viewer.getFromFile( file, font );
	if( dxf ) {
		
		new Hover( html.three.renderer.domElement, html.three.scene, html.three.camera, dxf );

		html.three.scene.add( dxf );
		html.three.centerCamera();
	}
};

html.init();
  






