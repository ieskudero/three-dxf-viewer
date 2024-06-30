import { LineSegments, Mesh } from 'three';
import { Merger } from '../../utils/merger.js';

/**
 * @class BlockMerger
 * @classdesc This class merges all meshes and lines of a block into a single mesh and line.
 * Modified using Merger class as base.
 */
export class BlockMerger extends Merger {
	constructor() {
		super();
	}

	// @override
	merge( scene, clone = true, uuids = [] ) {

		let { mesh, line } = this._getMergedObjects( scene, clone, uuids );

		//add mesh
		if ( ( mesh || line ) && scene.userData && scene.userData.entity ) {
			let sx = scene.userData.entity.scaleX ? scene.userData.entity.scaleX : 1;
			let sy = scene.userData.entity.scaleY ? scene.userData.entity.scaleY : 1;
			let sz = scene.userData.entity.scaleZ ? scene.userData.entity.scaleZ : 1;

			//add mesh
			if ( mesh ) {
				mesh.scale.set( sx, sy, sz );
				if ( scene.userData.entity.rotation ) {
					mesh.rotation.z = scene.userData.entity.rotation * Math.PI / 180;
				}
				mesh.position.set( scene.userData.entity.x, scene.userData.entity.y, scene.userData.entity.z );
				scene.add( mesh );
			}

			//add LineSegments
			if ( line ) {
				line.scale.set( sx, sy, sz );
				if ( scene.userData.entity.rotation ) {
					line.rotation.z = scene.userData.entity.rotation * Math.PI / 180;
				}
				line.position.set( scene.userData.entity.x, scene.userData.entity.y, scene.userData.entity.z );
				scene.add( line );
			}
		} else {
			if ( mesh ) mesh.add( mesh ); 
			if ( line ) scene.add( line ); 
		}

		this._removeEmptyGroups( scene );

		return scene;
	}

	// @override 
	_getMergedObjects( scene, clone, uuids ) {
        
		let { mesh, line } = this._getMergedGeometry( scene, clone, uuids );

		const m = mesh.geometry ? new Mesh( mesh.geometry, mesh.materials ) : null;
		const l = line.geometry ? new LineSegments( line.geometry, line.materials ) : null;

		if ( m ) m.userData = { entities: mesh.userData, entity: scene.userData.entity };
		if ( l ) l.userData = { entities: line.userData, entity: scene.userData.entity };

		return { mesh: m, line: l };
	}
}