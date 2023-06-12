import { Vector3, Box3 } from 'three';

/**
 * @class Snaps
 * @classdesc Class that stores all the scene points in a voxeliced way to fast tracking of points and entities
 * 
 */
export class Snaps {
	constructor() {
		this.snaps = [];
		//we voxelize the space to speed up the search
		this.min = new Vector3( Infinity, Infinity, Infinity );
		this.max = new Vector3( -Infinity, -Infinity, -Infinity );
		this.cuts = 5;
		this.voxel = null;

		//we always round to 6 decimals in order to avoid comparing errors
		this.decimals = 6;
	}

	/**
	 * Fills the snaps array with the points of the scene
	 * @param objs {Array|THREE.Object3D} ThreeJS object or array of ThreeJS objects.
	*/
	process( objs ) {
        
		objs = objs instanceof Array ? objs : [ objs ];

		//get snaps
		this._getSnaps( objs, true, false );
        
		//get scene size
		this._getSize( objs );

		//generate voxels
		this.voxel = this._generateVoxels( this.min, this.max, 1 )[0];
        
		//add each snap into its corresponding voxel
		this.snaps.forEach( point => this._addPointToVoxel( point, this.voxel.voxels ) );
	}

	/**
	 * Finds the nearest voxel to the point
	 * @param {ThreeJS.Vector3} point Point to check near voxels. Type: THREE.Vector3
	*/
	findVoxel( point, voxels = null ) {
		
		let roundedPoint = {
			x: Number( point.x.toFixed( this.decimals ) ),
			y: Number( point.y.toFixed( this.decimals ) ),
			z: Number( point.z.toFixed( this.decimals ) ),
		};
		voxels = voxels || this.voxel.voxels;
		for ( let i = 0; i < voxels.length; i++ ) {
			let voxel = voxels[i];
			if ( voxel.min.x <= roundedPoint.x && roundedPoint.x <= voxel.max.x && 
				voxel.min.y <= roundedPoint.y && roundedPoint.y <= voxel.max.y && 
				voxel.min.z <= roundedPoint.z && roundedPoint.z <= voxel.max.z ) {
				if ( voxel.voxels.length > 0 ) {
					return this.findVoxel( point, voxel.voxels );
				} else {
					return voxel;
				}
			}
		}
		return null;
	}

	_getSnaps( objs, lines = true, meshes = true ) {
				
		for ( let i = 0; i < objs.length; i++ ) {
			const group = objs[i];
			
			group.traverse( obj => {
				if( lines && ( obj.isLine || obj.isLineSegments ) ) {
					obj.updateWorldMatrix( true, false );
					//So far we get first & last points, but we can get all points by looping through the vertices
					this.snaps.push( {
						entity: obj,
						point: new Vector3( obj.geometry.attributes.position.getX( 0 ), 
							obj.geometry.attributes.position.getY( 0 ), 
							obj.geometry.attributes.position.getZ( 0 ) ).applyMatrix4( obj.matrixWorld ) 
					} );
					let last = obj.geometry.attributes.position.count - 1;
					this.snaps.push( {
						entity: obj,
						point: new Vector3( obj.geometry.attributes.position.getX( last ), 
							obj.geometry.attributes.position.getY( last ), 
							obj.geometry.attributes.position.getZ( last ) ).applyMatrix4( obj.matrixWorld ) 
					} );
				}
				if( meshes && ( obj.isMesh ) ) {
					obj.updateWorldMatrix( true, false );

					for ( let j = 0; j < obj.geometry.attributes.position.count; j++ ) {
						this.snaps.push( {
							entity: obj,
							point: new Vector3( obj.geometry.attributes.position.getX( j ), 
								obj.geometry.attributes.position.getY( j ), 
								obj.geometry.attributes.position.getZ( j ) ).applyMatrix4( obj.matrixWorld ) 
						} );
					}
				}
			} );
		}
	}

	_generateVoxels( min, max, count ) {
		if( count === this.cuts ) return [];

		let voxels = [];
		let step = max.clone().sub( min ).multiplyScalar( 1 / count );
		for ( let i = 0; i < count; i++ ) {
			for ( let j = 0; j < count; j++ ) {
				for ( let h = 0; h < count; h++ ) {
					let voxel = {
						name: 'VOXEL_' + i + '_' + j + '_' + h,
						min: new Vector3( min.x + i * step.x, min.y + j * step.y, min.z + h * step.z ),
						max: new Vector3( min.x + ( i + 1 ) * step.x, min.y + ( j + 1 ) * step.y, min.z + ( h + 1 ) * step.z ),
						snaps: []
					};
					voxel.voxels = this._generateVoxels( voxel.min, voxel.max, count + 1 );
					voxels.push( voxel );
					
				}
			}
		}
		return voxels;
	}

	_addPointToVoxel( point, voxels ) {
		for ( let i = 0; i < voxels.length; i++ ) {
			let voxel = voxels[i];
			if( voxel.min.x <= point.point.x && point.point.x <= voxel.max.x &&
                voxel.min.y <= point.point.y && point.point.y <= voxel.max.y &&
                voxel.min.z <= point.point.z && point.point.z <= voxel.max.z ) {
				if( voxel.voxels.length === 0 ) voxel.snaps.push( point );
				else this._addPointToVoxel( point, voxel.voxels );
				return;
			}            
		}
	}

	_getSize( objs ) {
		objs.forEach( group => {
			let box = new Box3().setFromObject( group );
			this.min.set( Math.min( this.min.x, box.min.x ), Math.min( this.min.y, box.min.y ), Math.min( this.min.z, box.min.z ) );
			this.max.set( Math.max( this.max.x, box.max.x ), Math.max( this.max.y, box.max.y ), Math.max( this.max.z, box.max.z ) );
		} );
	}
	
	/**
	 * Clears all the data for a correct dispose of the object.
	*/
	clear() {
		this.snaps.length = 0;
		this.min = null;
		this.max = null;
		this.voxel = null;
	}
}