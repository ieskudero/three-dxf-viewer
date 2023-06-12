import { Raycaster } from 'three';

export class Raycasting {

	constructor( container, camera, targets ) {

		this.camera = camera;
		this.container = container;
		this.raycaster = new Raycaster();
		this._calculateThreshold();
		
		this.targets = targets;

		//detect zoom change and change the threshold accordingly
		this.container.addEventListener( 'wheel', () => {
			this._calculateThreshold();
		} );

	}

	raycast( pointer ) {
		
		this.raycaster.setFromCamera( pointer, this.camera );

		const intersects = this.raycaster.intersectObjects( this.targets, true );

		return intersects.length === 0 ? null : intersects[0];
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