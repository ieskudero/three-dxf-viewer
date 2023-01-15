import { Boilerplate3D } from './boilerplate3d';

export class Boilerplate {

	constructor() {
		this.onLoad = null;
	}

	init() {

		//add html
		this._addHtml();
		
		//scene managing code
		this.three = new Boilerplate3D(); 

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

	_addHtml() {
		//create input element
		let input = document.createElement( 'input' );
		input.type = 'file';
		input.id = 'file';
		document.body.insertBefore( input, document.body.firstChild );

		let loading = document.createElement( 'div' );
		loading.id = 'loading';
		loading.innerText = 'Loading...';
		document.body.insertBefore( loading, document.body.firstChild );
	}

	async loadFile( event ) {	
	
		var file = event instanceof DragEvent ? event.dataTransfer.files[0] : event.target.files[0];
	
		this.loading.style.display = 'block';
		
		if( this.onLoad ) await this.onLoad( file );	
		
		this.loading.style.display = 'none';
	}
}