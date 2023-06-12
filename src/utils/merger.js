import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Mesh, BufferAttribute, LineSegments } from 'three';

/**
 * @class Merger
 * @classdesc This class merges all meshes and lines of a scene into a single mesh and line.
 * It checks and fixes attributes before merging all using [BufferGeometryUtils](https://threejs.org/docs/#examples/utils/BufferGeometryUtils)
 */
export class Merger {
	constructor() {
	}

	/**
	 * Returns a merged scene. Setting clone to true avoids changing original geometry, but its permormance is lower
	 * @param scene {THREE.Object3D} Threejs object (usually the scene itself).
	 * @param clone {boolean} Flag to change cloning of scene.
	 * @param uuids {Array} Array of uuids to merge only specific objects.
     * @return {THREE.Object3D} object with merged data
	*/
	merge( scene, clone = true, uuids = [] ) {

		let { mesh, line } = this._getMergedObjects( scene, clone, uuids );

		//add mesh
		if( mesh ) scene.add( mesh );

		//add LineSegments
		if( line ) scene.add( line );

		this._removeEmptyGroups( scene );

		return scene;
	}

	_getMergedObjects( scene, clone, uuids ) {
        
		let { mesh, line } = this._getMergedGeometry( scene, clone, uuids );

		const m = mesh.geometry ? new Mesh( mesh.geometry, mesh.materials ) : null;
		const l = line.geometry ? new LineSegments( line.geometry, line.materials ) : null;

		if( m ) m.userData = mesh.userData;
		if( l ) l.userData = line.userData;

		return { mesh: m, line: l };
	}

	_getMergedGeometry( scene, clone, uuids ) {
		let orderedMeshes = [];
		let orderedLines = [];
		let meshUserData = [];
		let lineUserData = [];
		let userDataTemp = null;
		//update all matrix
		scene.updateWorldMatrix( false, true );
        
		//get all uuids into an object for fast comparing
		let uuidsobj = {};
		uuids.forEach( uuid => uuidsobj[ uuid ] = true );

		this._removableTraverse( scene, child => {
			if( !( child.isMesh || child.isLineSegments || child.isLine ) ) return;

			if( uuids.length > 0 && !uuidsobj[ child.uuid ] ) return;

			//get geometry
			let geometry = clone ? child.geometry.clone() : child.geometry;
			geometry.applyMatrix4( child.matrixWorld );

			if( child.isMesh ) {

				if ( geometry.index ) geometry = geometry.toNonIndexed();

				//if normal-s not presented add
				if( !geometry.hasAttribute( 'normal' ) ) geometry.computeVertexNormals();				

				//if uv-s not presented add
				let uv = geometry.getAttribute( 'uv' );
				if ( !uv ) {
					uv = new BufferAttribute( new Float32Array( geometry.attributes.position.count * 2 ), 2 );
					geometry.setAttribute( 'uv', uv );
				}

				//if uvs itemSize 3 fix it to 2
				if( geometry.attributes.uv.itemSize > 2 ) {
					let uv = new BufferAttribute( new Float32Array( geometry.attributes.uv.count * 2 ), 2 );
					for ( let i = 0; i < geometry.attributes.uv.count; i++ ) {
						uv.set( geometry.attributes.uv.getX( i ), i * 2 );
						uv.set( geometry.attributes.uv.getY( i ), i * 2 + 1 );
					}
					geometry.deleteAttribute( 'uv' );
					geometry.setAttribute( 'uv', uv );
				}

				userDataTemp = meshUserData;

			} else {
				//LINE
				if ( child.geometry.index ) {
					child.geometry = child.geometry.toNonIndexed();
				}
				child.computeLineDistances();
				geometry = child.geometry.clone();
				geometry.applyMatrix4( child.matrixWorld );
				this._indexLineGeometry( geometry );

				//JUST IN CASE, WE REMOVE NORMAL & UV. I THINK THEY ARE NOT NEEDED. 
				//IF THEY ARE, ADD THEM TO THOSE IN NEED INSTEAD OF REMOVING THEM FROM THOSE HAVING THEM
				geometry.deleteAttribute( 'uv' );
				geometry.deleteAttribute( 'normal' );
				
				userDataTemp = lineUserData;
			}

			//add user data			
			userDataTemp.push( { uuid: child.uuid, userData: child.userData } );
			
			//add to group
			let list = child.isMesh ? orderedMeshes : orderedLines;            
			let group = this._findGroup( list, child.material );
			if( !group ) {
				group = { 
					material: child.material, 
					geometries: [] 
				};
				list.push( group );
			}
			group.geometries.push( geometry );
			geometry.ent = child;

			//remove children know. Otherwise, storing the children in an array & removing later cost as much as the entire merge
			if( child.parent ) child.parent.remove( child );
		} );

		let groupedMesh = orderedMeshes.length > 0 ? this._mergeByMaterial( orderedMeshes ) : null;
		let groupedLines = orderedLines.length > 0 ? this._mergeByMaterial( orderedLines ) : null;

		return { 
			mesh: {
				geometry: groupedMesh ? groupedMesh.geometry : null, 
				materials: groupedMesh ? groupedMesh.materials : null,
				userData: meshUserData
			},
			line: {
				geometry: groupedLines ? groupedLines.geometry : null, 
				materials: groupedLines ? groupedLines.materials : null,
				userData: lineUserData
			}
		};        
	}

	_mergeByMaterial( orderedGroups ) {
        
		let materials = orderedGroups.map( og => og.material );

		//merge with no grouping        
		let geometry = BufferGeometryUtils.mergeGeometries( 
			orderedGroups.map( group => BufferGeometryUtils.mergeGeometries( group.geometries, false ) ), 
			true );

		//order now by material
		return { 
			geometry: geometry,
			materials: materials
		};
	}

	_removeEmptyGroups( scene ) {
		for ( let i = scene.children.length - 1; i > -1; i-- ) {
			let child = scene.children[i];
			this._removeEmptyGroups( child );
			if( child.isGroup && child.children.length === 0 ) scene.remove( child );
		}
	}

	_indexLineGeometry( geometry ) {
		let index = [];
		let posCount = geometry.attributes.position.count;
		for ( let i = 0; i < posCount; i++ ) {            
			if( i > 0 ) {
				index.push( i - 1 );
				index.push( i );
			}
		}
		geometry.setIndex( new BufferAttribute( new Uint16Array( index ), 1 ) );
	}

	//USE THIS INSTEAD OF Array.find: FOR BETTER PERFORMANCE
	_findGroup( groups, material ) {
		for ( let i = 0; i < groups.length; i++ ) {
			if( groups[i].material === material ) return groups[i];            
		}
		return null;
	}

	_removableTraverse( root, method ) {
        
		//inverse for. This way we can remove safely
		for ( let i = root.children.length - 1; i > -1; i-- ) {
			this._removableTraverse( root.children[i], method );
		}

		method( root );
	}
}