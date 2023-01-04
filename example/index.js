import { DXFViewer } from '../src/dxfViewer.js';
import { Merger } from '../src/utils/merger.js';
import { SnapsHelper } from '../src/utils/snapsHelper';
import { Boilerplate3D } from './boilerplate3d.js';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
let snaps, domain;

//EXAMPLE CODE
async function loadDXF( file ) {
	domain.clear();

	let dxf = await new DXFViewer().getFromFile( file, font );
	if( dxf ) {

		//Optional. Add control snap. Do it before merge
		if( snaps ) snaps.clear();
		snaps = new SnapsHelper( dxf, domain.renderer, domain.scene, domain.camera, domain.controls );

		//Optional. If CAD is too big we can merge it
		const merged = new Merger().merge( dxf );

		//add dxf
		domain.addDXF( merged );
	}
}
  
class Boilerplate {

	constructor() {
		//scene managing code
		domain = new Boilerplate3D(); 

		//attach load file & drop  event listener
		const input = document.getElementById( 'file' );
		input.addEventListener( 'change', async ( e ) => await this.loadFile( e ) );
		const canvas3d = document.getElementById( 'canvas3d' );
		canvas3d.addEventListener( 'drop', async ( e ) => { 
			e.preventDefault();
			await this.loadFile( e );
		} );
		canvas3d.addEventListener( 'dragover', ( e ) => e.preventDefault() );
		
		this.loading = document.getElementById( 'loading' );
	}

	async loadFile( event ) {	
	
		var file = event instanceof DragEvent ? event.dataTransfer.files[0] : event.target.files[0];
	
		this.loading.style.display = 'block';
	
		await loadDXF( file );		
		
		this.loading.style.display = 'none';
	}
}


//init html
new Boilerplate();



