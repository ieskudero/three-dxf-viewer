import { DXFViewer } from '../../src/dxfViewer.js';
import { Merger } from '../../src/utils/merger.js';
import { SnapsHelper } from '../../src/utils/snapsHelper';
import { Boilerplate } from '../boilerplate.js';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
let snaps;

//init html
let html = new Boilerplate();
html.onLoad = async ( file ) => {
	html.three.clear();

	let dxf = await new DXFViewer().getFromFile( file, font );
	if( dxf ) {

		//Optional. Add control snap. Do it before merge
		if( snaps ) snaps.clear();
		snaps = new SnapsHelper( dxf, html.three.renderer, html.three.scene, html.three.camera, html.three.controls );

		//Optional. If CAD is too big we can merge it
		const merged = new Merger().merge( dxf );

		//add dxf
		html.three.addDXF( merged );
	}
};

html.init();
  






