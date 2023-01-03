import { BaseEntity } from './baseEntity/baseEntity';
import { Group,
	BufferGeometry,
	Vector3,
	Line,
	BufferAttribute } from 'three';
import * as bSpline from 'dxf/lib/util/bSpline';

/**
 * @class SplineEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF spline entity class.
 */
export class SplineEntity extends BaseEntity {
	constructor( data ) { super( data ); }

	/**
	 * It filters all the spline entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		//get all texts
		let entities = data.entities.filter( entity => entity.type === 'SPLINE' );
		if( entities.length === 0 ) return null;

		let group = new Group();

		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];

			if( this._hideEntity( entity ) ) continue;
            
			let cached = this._getCached( entity );
			let geometry = null;
			let material = null;
			if( cached ) { 
				geometry = cached.geometry;
				material = cached.material;
			} else {
				let _drawData = this.drawSpline( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			//create mesh
			let mesh = new Line( geometry, material );
			if( material.type === 'LineDashedMaterial' ) this._fixMeshToDrawDashedLines( mesh );
			mesh.userData = entity;

			//add to group
			group.add( mesh );
		}

		return group;
	}

	/**
	 * Draws a spline entity.
	 * @param entity {entity} dxf parsed spline entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawSpline( entity ) {
        
		let lineType = 'line';
        
		if ( entity.lineTypeName ) {
			let ltype = this.data.tables.ltypes[entity.lineTypeName];
			if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
		}

		let material = this._getMaterial( entity, lineType );
		
		var points = this._getBSplinePolyline( entity.controlPoints, entity.degree, entity.knots );
		
		let geometry = new BufferGeometry().setFromPoints( points );
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._generatePointIndex( points ) ), 1 ) );
            
		return { geometry: geometry, material: material };
	}

	_getBSplinePolyline( controlPoints, degree, knots, interpolationsPerSplineSegment, weights = null ) {
		const polyline = [];
		const controlPointsForLib = controlPoints.map( function ( p ) {
			return [ p.x, p.y ];
		} );

		const segmentTs = [ knots[degree] ];
		const domain = [ knots[degree], knots[knots.length - 1 - degree] ];

		for ( let k = degree + 1; k < knots.length - degree; ++k ) {
			if ( segmentTs[segmentTs.length - 1] !== knots[k] ) {
				segmentTs.push( knots[k] );
			}
		}

		interpolationsPerSplineSegment = interpolationsPerSplineSegment || 25;
		for ( let i = 1; i < segmentTs.length; ++i ) {
			const uMin = segmentTs[i - 1];
			const uMax = segmentTs[i];
			for ( let k = 0; k <= interpolationsPerSplineSegment; ++k ) {
				const u = k / interpolationsPerSplineSegment * ( uMax - uMin ) + uMin;
				// Clamp t to 0, 1 to handle numerical precision issues
				let t = ( u - domain[0] ) / ( domain[1] - domain[0] );
				t = Math.max( t, 0 );
				t = Math.min( t, 1 );
				const p = bSpline.default( t, degree, controlPointsForLib, knots, weights );
				polyline.push( new Vector3( p[0], p[1], 0 ) );
			}
		}
		return polyline;
	}
}