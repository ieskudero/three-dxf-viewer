import { DXFViewer } from '../../src/dxfViewer.js';
import { SnapsHelper } from '../../src/utils/snapsHelper.js';
import { Boilerplate } from '../boilerplate.js';
import GUI from 'lil-gui';
import { Hover } from '../../src/utils/hover.js';
import { Select } from '../../src/utils/select.js';

import './index.css';

//global variables
const font = 'fonts/helvetiker_regular.typeface.json';
let viewer = new DXFViewer();
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

		//Optional. Add Hover
		const hover = new Hover( html.three.renderer.domElement, html.three.camera, dxf );
		hover.subscribe( 'hover', ( hovered ) => console.log( 'Hovered entity', hovered ) );

		//Optional. Add Selection
		const select = new Select( html.three.renderer.domElement, html.three.camera, dxf );
		select.subscribe( 'select', ( selects ) => console.log( 'Selected entities', selects ) );

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
  






