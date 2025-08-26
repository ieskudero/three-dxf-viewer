import { DXFViewer } from '../../src/dxfViewer.js';
import { SnapsHelper } from '../../src/utils/snapsHelper.js';
import { Boilerplate } from '../boilerplate.js';
import GUI from 'lil-gui';
import { CADControls } from '../../src/utils/cadControls.js';

import './index.css';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
let viewer = new DXFViewer();
viewer.DefaultTextHeight = 12;
viewer.DefaultTextScale = 1;
let snaps, gui;

//init html
let html = new Boilerplate();
html.onLoad = async ( file ) => {
	if( gui ) gui.destroy();
	gui = new GUI( { width: 310 } );
	html.three.clear();

	let dxf = await viewer.getFromFile( file, font );
	if( dxf ) {
		
		//Optional. Add control snap.
		if( snaps ) snaps.clear();
		snaps = new SnapsHelper( dxf, html.three.renderer, html.three.scene, html.three.camera, html.three.controls );
		snaps.subscribe( 'nearSnap', ( snap ) => {			
			console.log( `distance from Mouse: ${snap.distance}, 3d entity: ${snap.snap.entity.uuid}, DXF entity: ${snap.snap.entity.userData.handle}` );
		} );

		//Optional. Add CAD Controls
		const controls = new CADControls( html.three.renderer.domElement, html.three.camera, dxf, viewer.lastDXF );
		controls.subscribe( 'hover', ( hovered ) => console.log( 'Hovered entity', hovered.userData.entity ) );
		controls.subscribe( 'select', ( selects ) => console.log( 'Selected entities', selects ) );

		//get layer names
		const layer_names = Object.keys( viewer.layers );

		//add entity array property to layers
		layer_names.forEach( name => viewer.layers[name].entities = [] );

		//add entities to layers
		dxf.traverse( m => {
			if( !m.userData || !m.userData.entity ) return; 

			let name = m.userData.entity.layer;
			if( viewer.layers[ name ] ) viewer.layers[ name ].entities.push( m );
		} );

		html.three.scene.add( dxf );
		html.three.centerCamera();
		
		//Optional - add layer visibility to gui
		layer_names.forEach( name => {
			const layer = viewer.layers[ name ];
			gui.add( layer, 'visible' ).name( name ).onChange( ( value ) => {
				layer.entities.forEach( e => e.visible = value );
			} );
		} );

		//colorize gui layers options with layer color
		document.querySelectorAll( '.controller' ).forEach( c => 
			c.style.color = `#${ viewer.layers[c.firstChild.innerText].color.toString( 16 ) }`
		);
	}
};

html.init();
  






