import { BaseEntity } from './baseEntity/baseEntity';
import { Vector3, 
	Group,
	Shape,
	ShapeGeometry,
	Mesh } from 'three';

/**
 * @class SolidEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF solid entity class.
 */
export class SolidEntity extends BaseEntity {
	constructor( data ) { super( data ); }

	/**
	 * It filters all the solid entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		//get all texts
		let entities = data.entities.filter( entity => entity.type === 'SOLID' );
		if( entities.length === 0 ) return null;

		let group = new Group();
		group.name = 'SOLIDS';
		
		for ( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];

			if( this._hideEntity( entity ) ) continue;
            
			let cached = this._getCached( entity );
			let geometry = null;
			let material = null;
			if( cached ) { 
				geometry = cached.geometry;
				material = cached.material;
			} else {
				let _drawData = this.drawSolid( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			//create mesh
			let mesh = new Mesh( geometry, material );
			mesh.userData = entity;

			//add to group
			group.add( mesh );
		}

		return group;
	}

	/**
	 * Draws a solid entity.
	 * @param entity {entity} dxf parsed solid entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawSolid( entity ) {
        
		let material = this._colorHelper.getMaterial( entity, 'shape', this.data.tables );
		
		let points = entity.corners.map( p => new Vector3( p.x, p.y, p.z ) );
		points.splice( 0, 0, points.pop() );
		
        
		const shape = new Shape( points );
		let geometry = new ShapeGeometry( shape );
		
		this._extrusionTransform( entity, geometry );
        
		return { geometry: geometry, material: material };
	}

	_extrusionTransform( entity, geometry ) {
		if( entity.extrusionZ < 0 ) {
			geometry.scale( -1, 1, 1 );
		}
	}
}