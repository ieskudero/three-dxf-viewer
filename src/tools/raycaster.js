import { MeshBasicMaterial, Vector2 } from 'three';
import { Raycasting } from './raycasting';
import { EventEmitter } from './eventEmitter';

export class Raycaster extends EventEmitter {

	constructor() {
		super();
	}

	_initRaycasting( container, camera, dxf, raycasting ) {

		//get all meshes from dxf
		const meshes = [];
		dxf.traverse( m => {
			if( m.geometry ) meshes.push( m );
		} );
		
		//initialize mouse pointer
		this.pointer = new Vector2();

		//initialize raycasting
		this.raycast = raycasting ? raycasting : new Raycasting( container, camera, meshes );
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

	_setMaterial( hex ) {
		
		const mat = new MeshBasicMaterial( { depthTest: false, depthWrite: false } );
		mat.color.setHex( hex );
		mat.color.convertSRGBToLinear();
		
		return mat;
	}
	
	_isInsideEntityList( element ) {
		//there is a list in the dxf file. We will see if the entity exist in it in order to select it.
		const e = element.userData.entity;
		if ( !e ) return false;
		return this.dxf.entities.find( ent => ent === e || ent.block === e.name );
	}

}