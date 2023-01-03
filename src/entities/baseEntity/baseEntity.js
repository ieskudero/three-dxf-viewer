import { BaseGeometry } from "./baseGeometry";
import { Properties } from "./properties";

/**
 * @class BaseEntity
 * @see {@link BaseGeometry.md}
 * @classdesc Base class for all the entities. It stores dxf entity visualization methods.
 */

export class BaseEntity extends BaseGeometry {
	constructor( data ) {
        super();
        this.data = data;
	}

    /**
     * 
     * @param entity {Entity} hides the entity according to entity's flags & general properties
     */
    _hideEntity( entity ) {
        
        if( typeof entity.visible !== 'undefined' && !entity.visible ) return true;
        
        if( typeof entity.paperSpace !== 'undefined' && Properties.showFrozen !== entity.paperSpace ) return true;

        if( entity.lineTypeName === 'HIDDEN' ) return true;
        let layer = this.data.tables.layers.hasOwnProperty( entity.layer ) ? this.data.tables.layers[ entity.layer ] : null;
        if( layer ) {

            if( layer.colorNumber < 0 ) return true;
            if( typeof layer.plot !== 'undefined' && !layer.plot ) return true;

            let flags = this._parseLayerFlags( layer.flags );
            if( !Properties.showFrozen && flags.includes( 'frozen' ) ) return true;
            if( !Properties.showLocked && flags.includes( 'locked' ) ) return true;
        }
        return false;
    }

    _parseLayerFlags( flag ) {
        /*
        1	Layer is frozen; otherwise layer is thawed; use is_frozen(), freeze() and thaw()
        2	Layer is frozen by default in new viewports
        4	Layer is locked; use is_locked(), lock(), unlock()
        16	If set, table entry is externally dependent on an xref
        32	If both this bit and bit 16 are set, the externally dependent xref has been successfully resolved
        64	If set, the table entry was referenced by at least one entity in the drawing the last time the drawing was edited. 
            (This flag is for the benefit of AutoCAD commands. It can be ignored by most programs that read DXF files and need not 
            be set by programs that write DXF files) 
        */
       if( flag === 0 ) return [];
       
       let flags = [];

       if( flag % 2 !== 0 ) flags.push( 'frozen' );
       if( ( 4 <= flag && flag < 16 ) || flag === 20 || flag ===36 || flag === 52 ) flags.push( 'locked' );
       if( ( 16 <= flag && flag < 64 ) ) flags.push( 'dependent' );

       return flags;
    }

    //micro-optimization. Use this instead of find
    _getBlock( blocks, name ) {
        for (let i = 0; i < blocks.length; i++) {
            if( blocks[i].name === name ) return blocks[i];            
        }
        return null;
    }
    
}