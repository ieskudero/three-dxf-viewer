import { MeshBasicMaterial } from 'three';
import { Raycasting } from './raycasting';

export class Hover {
	constructor( container, scene, camera, dxf, raycasting = null ) {

		this.scene = scene;
		this._initRaycasting( container, camera, dxf, raycasting );
		this._clonedObjects = {};

		//create orange hover material that will be seeen above all other materials
		this._hoverMaterial = new MeshBasicMaterial( { depthTest: false, depthWrite: false } );
		this._hoverMaterial.color.setHex( 0xffa500 );
		this._hoverMaterial.color.convertSRGBToLinear();
		this._hoverMaterial.color.convertSRGBToLinear();
	}

	_initRaycasting( container, camera, dxf, raycasting ) {
		const meshes = [];
		dxf.traverse( m => {
			if( m.geometry ) meshes.push( m );
		} );

		const rc = raycasting ? raycasting : new Raycasting( container, camera, meshes );
		rc.subscribe( 'intersected', ( intersect ) => {
			const obj = intersect.object.parent;
			if( !obj.userData ) return;

			this._drawHover( obj );
		} );
		rc.subscribe( 'noIntersected', () => {
			this._removeHover();
		} );
	}

	_drawHover( obj ) {
		
		this._removeHover();

		//clone first
		if( !this._clonedObjects[ obj.uuid ] ) this._clonedObjects[ obj.uuid ] = { clone: this._clone( obj ), parent: obj.parent };
		const cloneData = this._clonedObjects[ obj.uuid ];
		cloneData.clone.hovered = true;
		
		//set material
		cloneData.clone.traverse( c => { if ( c.material ) c.material = this._hoverMaterial; } );

		this._hovered = cloneData.clone;

		cloneData.parent.add( this._hovered );
	}

	_clone( obj ) {
		const tree = {};
		//pass all userDatas to tree
		obj.traverse( c => { 
			tree[ c.uuid ] = c.userData;
			c.userData = null;
		} );
		const clone = obj.clone();

		//restore userDatas
		obj.traverse( c => {
			c.userData = tree[ c.uuid ];
		} );

		return clone;
	}

	_removeHover() {
		//remove previous hover
		if( this._hovered && this._hovered.parent ) { 
			this._hovered.parent.remove( this._hovered ); 
			this._hovered = null;
		}
	}

}