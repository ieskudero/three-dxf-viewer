import { Properties } from './properties';
import { BaseCache } from './baseCache';
import { ColorHelper } from './colorHelper';
import { GeometryHelper } from './geometryHelper';
import { LayerHelper } from './layerHelper';

/**
 * @class BaseEntity
 * @see {@link BaseCache.md}
 * @classdesc Base class for all the entities. It stores dxf entity visualization methods.
 */

export class BaseEntity extends BaseCache {
	constructor( data ) {
		super();
		this.data = data;
		this._colorHelper = new ColorHelper();
		this._geometryHelper = new GeometryHelper();
		this._layerHelper = new LayerHelper();
	}
	
	/**
     * 
     * @param entity {Entity} hides the entity according to entity's flags & general properties
     */
	_hideEntity( entity ) {
        
		if( typeof entity.visible !== 'undefined' && !entity.visible ) return true;
        
		if( typeof entity.paperSpace !== 'undefined' && Properties.showFrozen !== entity.paperSpace ) return true;

		let layer = Object.prototype.hasOwnProperty.call( this.data.tables.layers, entity.layer ) ? this.data.tables.layers[ entity.layer ] : null;
		if( layer ) {
			
			if( !layer.visible ) return true;
			
			if( !Properties.showFrozen && layer.flags.includes( 'frozen' ) ) return true;
			if( !Properties.showLocked && layer.flags.includes( 'locked' ) ) return true;
		}
		return false;
	}

	//micro-optimization. Use this instead of find
	_getBlock( blocks, name ) {
		for ( let i = 0; i < blocks.length; i++ ) {
			if( blocks[i].name === name ) return blocks[i];            
		}
		return null;
	}
    
}