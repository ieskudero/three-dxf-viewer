import { DXFViewer } from '../../src/dxfViewer.js';
import { Merger } from '../../src/utils/merger.js';
import { SnapsHelper } from '../../src/utils/snapsHelper';
import { Boilerplate } from '../boilerplate.js';

import './index.css';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
let snaps;

//init html
let html = new Boilerplate();
html.onLoad = async ( file ) => {
	html.three.clear();
	
	const viewer = new DXFViewer();
	viewer.subscribe( 'log', ( message ) => console.log( message ) );
	viewer.subscribe( 'error', ( message ) => console.error( message ) );

	let dxf = await viewer.getFromFile( file, font );
	if( dxf ) {

		//Optional. Add control snap. Do it before merge
		if( snaps ) snaps.clear();
		snaps = new SnapsHelper( dxf, html.three.renderer, html.three.scene, html.three.camera, html.three.controls );		
		snaps.subscribe( 'nearSnap', ( snap ) => {			
			console.log( `distance from Mouse: ${snap.distance}, 3d entity: ${snap.snap.entity.uuid}, DXF entity: ${snap.snap.entity.userData.entity.handle}` );
		} );

		//Optional. If CAD is too big we can merge it
		const merged = new Merger().merge( dxf );

		//add dxf
		html.three.addDXF( merged );
	}
};

html.init();
  






