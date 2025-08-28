import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { TextEntity } from './textEntity';
import { InsertEntity } from './insertEntity';
import { SolidEntity } from './solidEntity';
import{ BlockEntity } from './blockEntity';
import { Group } from 'three';

/**
 * @class DimensionEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF dimension entity class.
 */
export class DimensionEntity extends BaseEntity {

	constructor( data, font ) { 
		super( data );
		this._font = font;
		this._lineEntity = new LineEntity( data, font );
		this._textEntity = new TextEntity( data, font );
		this._insertEntity = new InsertEntity( data, font );
		this._solidEntity = new SolidEntity( data );
		this._blockEntity = new BlockEntity( data, font );
	}

	/**
	 * It filters all the dimension entities and draw them. Uses Line, Text, Insert, Solid & Block entities.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	async draw( data ) {

		//get all dimensions
		let entities = data.entities.filter( entity => entity.type === 'DIMENSION' );
		if( entities.length === 0 ) return null;

		//attach the corresponding block to each dimension
		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];
			let blockObj = this._getBlock( data.blocks, entity.block );
			if( blockObj ) entity.blockObj = blockObj;
		}

		let result = new Group();
		result.name = 'DIMENSIONS';
		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];

			if( !entity.blockObj ) continue;
            
			let dimGroup = new Group();
			dimGroup.name = 'DIMENSION';
			dimGroup.userData = { entity: entity };
			let block = await this._blockEntity.drawBlock( entity.blockObj );
			dimGroup.add( block );

			result.add( dimGroup );
		}

		return result;
	}
}