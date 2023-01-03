import { Vector3 } from 'three';
import { BaseColor } from './baseColor';

/**
 * @class BaseGeometry
 * @see {@link BaseColor.md}
 * @classdesc Base class for all the entities. It stores the geometry methods & information.
 */
export class BaseGeometry extends BaseColor {

	constructor() {
		super();
		this._zAxis = new Vector3( 0, 0, 1 );
	}

	_generatePointIndex( points ) {
		let index = [];
        
		for ( let i = 1; i < points.length; i++ ) {
			index.push( i - 1 );
			index.push( i );
		}

		return index;
	}

	_fixMeshToDrawDashedLines( line ) {
		if( line.geometry.index ) line.geometry = line.geometry.toNonIndexed();
		line.computeLineDistances();
	}
}