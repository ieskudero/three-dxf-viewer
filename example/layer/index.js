import { DXFViewer } from '../../src/dxfViewer.js';
import { SnapsHelper } from '../../src/utils/snapsHelper.js';
import { Merger } from '../../src/utils/merger.js';
import { Boilerplate } from '../boilerplate.js';
import GUI from 'lil-gui';

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

		//get layer names
		const layer_names = Object.keys( viewer.layers );

		//add entity array property to layers
		layer_names.forEach( name => viewer.layers[name].entities = [] );

		//add entities to layers
		dxf.traverse( m => {
			if( !m.userData ) return; 

			let name = m.userData.layer;
			if( viewer.layers[ name ] ) viewer.layers[ name ].entities.push( m );

		} );

		//merge layer and add to scene
		layer_names.forEach( name =>  { 
			
			const layer = viewer.layers[ name ];

			if( layer.entities.length === 0 ) return;
			
			//merge layer
			layer.entity = new Merger().merge( dxf, true, layer.entities.map( m => m.uuid ) );
			layer.entity.dxfLayer = layer;

			//add to scene
			html.three.scene.add( layer.entity );
		} );
		html.three.centerCamera();
		
		//Optional - add layer visibility to gui
		layer_names.forEach( name => gui.add( viewer.layers[ name ], 'visible' ).name( name ).onChange( ( value ) => {
			let obj3d = html.three.scene.children.filter( c => c.dxfLayer.name === name )[0]; 
			if( obj3d ) obj3d.visible = value;
		} ) );

		//colorize gui layers options with layer color
		document.querySelectorAll( '.controller' ).forEach( c => 
			c.style.color = `#${ viewer.layers[c.firstChild.innerText].color.toString( 16 ) }`
		);
	}
};

html.init();
  






