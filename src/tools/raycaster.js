import { MeshBasicMaterial, Vector2 } from 'three';
import { Raycasting } from './raycasting';

export class Raycaster {

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
		
		this._material = new MeshBasicMaterial( { depthTest: false, depthWrite: false } );
		this._material.color.setHex( hex );
		this._material.color.convertSRGBToLinear();
	}

}