import { DXFViewer } from '../dxfViewer.js';
import { Merger } from '../src/utils/merger.js';
import { Snapshelper } from '../src/utils/snapsHelper';
import { Boilerplate3D } from './boilerplate3d.js';

let font = 'fonts/helvetiker_regular.typeface.json';

let snaps;

//attach load file event listener
const fileInput = document.getElementById( 'file' );
fileInput.addEventListener( 'change', loadFile );

const loading = document.getElementById( 'loading' );

async function loadFile( event ) {
	var file = event.target.files[0];

	loading.style.display = 'block';
	domain.clear();

	let dxf = await new DXFViewer().getFromFile( file, font );
	if( dxf ) {

		//Optional. Add control snap. Do it before merge
		if( snaps ) snaps.clear();
		snaps = new Snapshelper( dxf, domain.renderer, domain.scene, domain.camera, domain.controls );

		//Optional. If CAD is too big we can merge it
		const merged = new Merger().merge( dxf );

		//add dxf
		domain.addDXF( merged );
	}
	
	loading.style.display = 'none';
}

//scene managing code
const domain = new Boilerplate3D(); 
