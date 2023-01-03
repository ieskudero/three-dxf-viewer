import { BoxGeometry, Mesh, MeshBasicMaterial, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { Snaps } from './snaps.js';

/**
 * @class Snapshelper
 * @classdesc Auxiliar class that shows how to use snaps and get entity information from snap point
 * 
 */
export class SnapsHelper {
	
	/**
	 * Constructor
	 * @param dxf {Array|THREE.Object3D} ThreeJS object or array of ThreeJS objects.
	 * @param renderer {THREE.WebGLRenderer} ThreeJS renderer.
	 * @param scene {THREE.Scene} ThreeJS scene.
	 * @param camera {THREE.Camera} ThreeJS camera.
	 * @param controls {THREE.OrbitControls} ThreeJS orbit controls.
	*/
	constructor( dxf, renderer, scene, camera, controls ) {
		
		this.container = renderer.domElement;
		this.scene = scene;
		this.camera = camera;
		this.controls = controls;
		
		this.snaps = new Snaps();
		this.snaps.process( dxf );

		this._mouseDownEvent =  ( e ) => { this._mouseDown( e ); };
		this._mouseUpEvent =  ( e ) => { this._mouseUp( e ); };
		this._mouseMoveEvent =  ( e ) => { this._mouseMove( e ); };

		this.container.addEventListener( 'pointerdown', this._mouseDownEvent );
		this.container.addEventListener( 'pointerup', this._mouseUpEvent );
		this.container.addEventListener( 'pointermove', this._mouseMoveEvent );

		this.raycaster = new Raycaster();
		this.mouse = new Vector2();
		this.plane = new Plane();
		this.planeNormal = new Vector3();
		this.mousePos = new Vector3();
		this.vectorHelper = new Vector3();
	}

	_mouseDown() {
	}
	_mouseUp() {
	}

	_mouseMove( e ) {

		if( this.snaps ) {
			e.mousePosInScene = this._getMousePosInScene( e );
			let point = { x: e.mousePosInScene.x, y: e.mousePosInScene.y, z: e.mousePosInScene.z };
			let voxel = this.snaps.findVoxel( point );
			if( voxel ) {
				let nearestSnap = this._findNearestSnapPoint( point, voxel );
				if( !nearestSnap.snap ) { this._hideSnapSquare(); return; }
				
				//si está a 5 unidades del punto hacemos snap y cambiamos el punto del ratón
				if( nearestSnap.distance < 5 ) {
					e.mousePosInScene = { x: nearestSnap.snap.point.x, y: nearestSnap.snap.point.y, z: nearestSnap.snap.point.z };
					this._showSnapSquare( nearestSnap );
				}
				else
					this._hideSnapSquare();
			}
		}
	}	

	resetSnaps() {
        
		this._clearSnapSquare();

		this.snaps = new Snaps();
		this.snaps.process( this.__cache.meshes );
	}

	_findNearestSnapPoint( point, voxel ) {
		let min = { snap: null, distance: Infinity };
		for ( let i = 0; i < voxel.snaps.length; i++ ) {
			const snap = voxel.snaps[i];
			let distance = snap.point.distanceTo( point );
			if( distance < min.distance ) {
				min.snap = snap;
				min.distance = distance;
			}
		}
		return min;
	}

	_hideSnapSquare() {
		if( this._snapSquare ) this._snapSquare.visible = false;
	}

	_showSnapSquare( snap ) {
		if( !this._snapSquare ) {
			let size = 10;
			this._snapSquare = new Mesh( new BoxGeometry( size, size, size ), new MeshBasicMaterial( { color: 0xffa500, wireframe: true } ) );
			this._snapSquare.visible = false;
			this._snapSquare.initial = true;
			this.scene.add( this._snapSquare );
		}

		this._snapSquare.position.copy( snap.snap.point );
		this._snapSquare.visible = true;

		console.log( `distance from Mouse: ${snap.distance}, 3d entity: ${snap.snap.entity.uuid}, DXF entity: ${snap.snap.entity.userData.handle}` );
	}

	_getMousePosInScene( event ) {

		let container = event.currentTarget;

		let distanceToTarget = this.camera.position.distanceTo( this.controls.target );
		
		this.mouse.x = ( event.offsetX / container.offsetWidth ) * 2 - 1;
		this.mouse.y = - ( event.offsetY / container.offsetHeight ) * 2 + 1;
		
		this.planeNormal.copy( this.camera.getWorldDirection( this.vectorHelper ) );

		let vec = this.camera.position.clone();
		vec.add( this.planeNormal.multiplyScalar( distanceToTarget ) );

		this.plane.setFromNormalAndCoplanarPoint( this.planeNormal, vec );

		this.raycaster.setFromCamera( this.mouse, this.camera );
		this.raycaster.ray.intersectPlane( this.plane, this.mousePos );

		return this.mousePos;
	}

	
	/**
	 * Clears all the data for a correct dispose of the object.
	*/
	clear() {

		this._clearSnapSquare();
		this.snaps.clear();

		this.container.removeEventListener( 'pointerdown', this._mouseDownEvent );
		this.container.removeEventListener( 'pointerup', this._mouseUpEvent );
		this.container.removeEventListener( 'pointermove', this._mouseMoveEvent );

		this.snaps = null;
		this.container = null;
		this.scene = null;
		this.camera = null;
		this.controls = null;
		
		this.raycaster = null;
		this.mouse = null;
		this.plane = null;
		this.planeNormal = null;
		this.mousePos = null;
		this.vectorHelper = null;

	}

	_clearSnapSquare() {
		if( this._snapSquare ) {
			if( this._snapSquare.parent ) this._snapSquare.parent.remove( this._snapSquare );
			this._snapSquare.geometry.dispose();
			this._snapSquare.material.dispose();
			this._snapSquare = null;
		}
	}
}