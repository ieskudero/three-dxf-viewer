import { ColorHelper } from './colorHelper';

/**
 * @class LayerHelper
 * @classdesc Layer management helper class.
 */
export class LayerHelper {

	constructor() {}

	parse( layers ) {
		const parsed = {};

		let colorHelper = new ColorHelper();

		const keys = Object.keys( layers );
		for ( let i = 0; i < keys.length; i++ ) {
			const layer = layers[ keys[ i ] ];
			parsed[ keys[ i ] ] = {
				name: layer.name,
				lineTypeName: layer.lineTypeName,
				lineWeightEnum: layer.lineWeightEnum,
				color: colorHelper.getColorByNumber( layer.colorNumber ),
				visible: this.isVisible( layer ),
				flags: this.parseFlags( layer.flags )
			};
		}

		return parsed;
	}

	/**
	 * Returns the separated flags based on the flag number.
     * @param flag {Number} A flag to indicate the type of material to be created. It can be 'shape', 'line' or 'dashed'.
     * @return {Array} frozen, locaked and dependent flags
	*/
	parseFlags( flag ) {
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


	/**
	 * Returns if layer is visible ot not.
     * @param layer {Layer} layer object.
     * @return {Boolean} layer visibility
	*/
	isVisible( layer ) {
		if( layer.colorNumber < 0 ) return false;
		if( typeof layer.plot !== 'undefined' && !layer.plot ) return false;

		return true;
	}

}