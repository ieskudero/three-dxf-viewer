import { Vector3 } from 'three';

/**
 * @class GeometryHelper
 * @classdesc Geometry management helper class
 */
export class GeometryHelper {

	constructor() {
		this.xAxis = new Vector3( 1, 0, 0 );
		this.yAxis = new Vector3( 0, 1, 0 );
		this.zAxis = new Vector3( 0, 0, 1 );
	}

	
	/**
	 * Returns an index array for a line.
	 * @param points {Array} vertex array to create an index.
     * @return {Array} index array
	*/
	generatePointIndex( points ) {
		let index = [];
        
		for ( let i = 1; i < points.length; i++ ) {
			index.push( i - 1 );
			index.push( i );
		}

		return index;
	}

	/**
	 * Prepares given THREE.Line object to draw dashed lines, changing to a non indexed geometry & computing line distances.
	 * @param line {THREE.Line} THREE.Line object to prepare for dashed lines.
	*/
	fixMeshToDrawDashedLines( line ) {
		if( line.geometry.index ) line.geometry = line.geometry.toNonIndexed();
		line.computeLineDistances();
	}
}