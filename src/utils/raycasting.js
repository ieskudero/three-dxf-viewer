import { Raycaster, Vector2 } from 'three';
import { EventEmitter } from './eventEmitter';

export class Raycasting extends EventEmitter {

	constructor( container, camera, targets ) {

		super();

		this.camera = camera;
		this.container = container;
		this.raycaster = new Raycaster();
		this.raycaster.params.Line.threshold = this._calculateThreshold();
		
		this.targets = targets;
		this.pointer = new Vector2();

		document.addEventListener( 'pointermove', async( e ) => await this._onPointerMove( e ), false );

		//detect zoom change and change the threshold accordingly
		document.addEventListener( 'wheel', () => {
			this._calculateThreshold();
		} );

	}

	async _onPointerMove( event ) {
		
		event.preventDefault();

		this.pointer.x = ( event.clientX / this.container.clientWidth ) * 2 - 1;
		this.pointer.y = - ( event.clientY / this.container.clientHeight ) * 2 + 1;
		
		await this._raycast();
	}

	async _raycast() {
		
		this.raycaster.setFromCamera( this.pointer, this.camera );

		const intersects = this.raycaster.intersectObjects( this.targets, true );

		if( intersects.length === 0 ) {
			await this.trigger( 'noIntersected' );
			return;
		}
		
		await this.trigger( 'intersected', intersects[0] );
	}

	_calculateThreshold() {
		const size = {
			width: this.camera.right / this.camera.zoom - this.camera.left / this.camera.zoom,
			height: this.camera.top / this.camera.zoom - this.camera.bottom / this.camera.zoom
		};
		const threshold = Math.min( size.width, size.height );
		this.raycaster.params.Line.threshold = threshold / 500;
	}

}