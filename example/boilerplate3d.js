import { Box3, Color, LinearToneMapping, MOUSE, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Boilerplate3D {
	constructor(){
		this.container;
		this.camera = null;
		this.scene = null;
		this.renderer = null;
		this.controls = null;

		this.loadScene();
		this.animate();

		window.camera = this.camera;

	}

	loadScene() {
	
		// dom
		this.container = document.createElement( 'div' );
		this.container.id = 'canvas3d';
		document.body.appendChild( this.container );
	
		// renderer
		this.renderer = new WebGLRenderer( {
			antialias: true
		} );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.container.appendChild( this.renderer.domElement );
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = LinearToneMapping;
		this.renderer.toneMappingExposure = 3;
		
		// scene
		this.scene = new Scene();
		this.scene.background = new Color( 0x212830 );
		
		// camera
		const size = 10000;
		let aspect = this.container.offsetWidth / this.container.offsetHeight;
		this.camera = new OrthographicCamera( -size * aspect , size * aspect , size, -size, -size/2, size );	
		
		//controls
		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		this.controls.zoomSpeed = 2;
		this.controls.enableRotate = false;
		this.controls.mouseButtons = {
			LEFT: MOUSE.PAN,
			MIDDLE: MOUSE.DOLLY,
			RIGHT: MOUSE.PAN
		};
		this.controls.update();
	
		//resize
		window.addEventListener( 'resize', () => {
			const aspect = this.container.clientWidth / this.container.clientHeight;
			const height = this.camera.top - this.camera.bottom;
			this.camera.left = -0.5 * aspect * height + this.camera.position.x;
			this.camera.right = 0.5 * aspect * height + this.camera.position.x;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize( this.container.clientWidth, this.container.clientHeight );
		} );
	}

	addDXF( dxf ) {
		this.scene.add( dxf );
		this.centerCamera();
	}

	centerCamera() {
		let box = new Box3().setFromObject( this.scene );
	
		let bigAxis = box.max.x - box.min.x > box.max.y - box.min.y ? 'x' : 'y';
		let size = bigAxis === 'x' ? box.max.x - box.min.x : box.max.y - box.min.y;
		let sizeFrustum = bigAxis === 'x' ? this.camera.right - this.camera.left : this.camera.top - this.camera.bottom;
		
		let lateralMargin = 0.9; //percentage of screento leave on the sides. 1 means no margin
		if( size < sizeFrustum ) { this.camera.zoom = lateralMargin * ( sizeFrustum / size ); this.camera.updateProjectionMatrix(); }
		else this.camera.zoom = 1;
	
		let center = box.min.add( box.max.sub( box.min ).divideScalar( 2 ) );
		
		this.camera.position.set( center.x , center.y, 1000 / 10 );
		this.controls.target.set( this.camera.position.x, this.camera.position.y, 0 );
	
		this.camera.updateProjectionMatrix();
	}

	clear() {
		while( this.scene.children.length > 0 ) { this.scene.remove( this.scene.children[0] ); }
	}
	
	animate() {
		requestAnimationFrame( () => { this.animate(); } );
		this.controls.update();
		this.renderer.render( this.scene, this.camera );
	}
}