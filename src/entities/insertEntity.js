import { BaseEntity } from './baseEntity/baseEntity';
import { Group } from 'three';
import { BlockEntity } from './blockEntity';

/**
 * @class InsertEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF insert entity class.
 */
export class InsertEntity extends BaseEntity {
	
	constructor( data, font ) { 
		super( data );
		this._font = font;
		this._blockEntity = new BlockEntity( data, font );
	}

	/**
	 * It filters all the insert entities and draw them. Uses blockEntity.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
		
		this.data = data;

		//get all inserts
		let entities = data.entities.filter( entity => entity.type === 'INSERT' );
		if( entities.length === 0 ) return null;

		//attach the corresponding block to each insert
		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];
			if( typeof entity.blockObj !== 'undefined' ) continue;

			let blockObj = this._getBlock( this.data.blocks, entity.block );
			if( blockObj ) entity.blockObj = blockObj;            
		}

		let result = new Group();
		result.name = 'INSERTS';
		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];

			if( this._hideEntity( entity ) ) continue;
			let obj = this.drawInsert( entity );
			if( obj ) result.add( obj );
		}

		return result;
	}

	/**
	 * Draws an insert entity.
	 * @param entity {entity} dxf parsed insert entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawInsert( entity ) {
		
		let cached = this._getCached( entity );
		if( cached ) { return cached; }

		let sx = typeof entity.scaleX !== 'undefined' ? entity.scaleX : 1;
		let sy = typeof entity.scaleY !== 'undefined' ? entity.scaleY : 1;
		let sz = typeof entity.scaleZ !== 'undefined' ? entity.scaleZ : 1;		

		let block = entity.blockObj ? entity.blockObj : this._getBlock( this.data.blocks, entity.block );

		let group = null;
		if( block && !this._blockEntity._hideBlockEntity( block ) ) {
			group = new Group();
			group.name = 'BLOCK';
			group.userData = { entity: entity };
			group.add( this._blockEntity.drawBlock( block ) );

			group.scale.set( sx, sy, sz );

			if ( entity.rotation ) {
				group.rotation.z = entity.rotation * Math.PI / 180;
			}
			
			group.position.set( entity.x, entity.y, entity.z );
		}

		this._setCache( entity, group );

		return group;
	}

}