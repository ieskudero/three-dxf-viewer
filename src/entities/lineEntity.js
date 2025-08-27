import { BaseEntity } from './baseEntity/baseEntity';
import { Line,
	BufferGeometry,
	Vector3, 
	Group } from 'three';
import { BufferAttribute } from 'three';
import * as createArcoFromPolyline from 'dxf/lib/util/createArcForLWPolyline';

/**
 * @class LineEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF line, polyline & lwpolyline entity class.
 */
export class LineEntity extends BaseEntity {
	constructor( data ) { super( data ); }

	/**
	 * It filters all the line, polyline and lwpolylin entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		let group = new Group();
		group.name = 'LINES';
		
		//get all lines
		let entities = data.entities.filter( entity => entity.type === 'LINE' || entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE' );
		if( entities.length === 0 ) return null;

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
				let _drawData = entity.type === 'LINE' ? this.drawLine( entity ) : this.drawPolyLine( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			//create mesh
			let mesh = new Line( geometry, material );
			if( material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( mesh );
			mesh.userData = { entity: entity };

			//add to group
			group.add( mesh );
		}

		return group;
	}

	/**
	 * Draws a line entity.
	 * @param entity {entity} dxf parsed line entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawLine( entity, extrusionZ = 1 ) {
        
		let lineType = 'line';
        
		if ( entity.lineTypeName ) {
			let ltype = this.data.tables.ltypes[entity.lineTypeName];
			if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
		}

		let material = this._colorHelper.getMaterial( entity, lineType, this.data.tables );

		let geometry = new BufferGeometry().setFromPoints( [
			{ x: extrusionZ * entity.start.x, y: entity.start.y, z: entity.start.z },
			{ x: extrusionZ * entity.end.x, y: entity.end.y, z: entity.end.z },
		] );
		geometry.setIndex( new BufferAttribute( new Uint16Array( [ 0, 1 ] ), 1 ) );
    

		return { geometry: geometry, material: material };
	}

	/**
	 * Draws a polyline or lwpolyline entity.
	 * @param entity {entity} dxf parsed polyline or lwpolyline entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawPolyLine( entity ) {
        
		let lineType = 'line';
        
		if ( entity.lineTypeName ) {
			let ltype = this.data.tables.ltypes[entity.lineTypeName];
			if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
		}

		let material = this._colorHelper.getMaterial( entity, lineType, this.data.tables );

		let points = this._getPolyLinePoints( entity.vertices, entity.closed );
		let geometry = new BufferGeometry().setFromPoints( points );
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._geometryHelper.generatePointIndex( points ) ), 1 ) );

		return { geometry: geometry, material: material };
	}

	_getPolyLinePoints( vertices, closed, extrusionZ = 1 ) {

		let points = [];
		const from = new Vector3();
		const to = new Vector3();
		for ( let i = 0, il = vertices.length; i < il - 1; ++i ) {

			let fromv = vertices[i];
			let tov = vertices[i + 1];
			let bulge = vertices[i].bulge;
			from.set( fromv.x, fromv.y, fromv.z );
			to.set( tov.x, tov.y, tov.z );

			points.push( { x: fromv.x, y: fromv.y, z: fromv.z } );
			if ( bulge ) {
				let arcPoints = createArcoFromPolyline.default( [ fromv.x, fromv.y, fromv.z ], [ tov.x, tov.y, tov.z ], bulge );
				for ( let j = 0, jl = arcPoints.length; j < jl; ++j ) {
					const arc = arcPoints[j];
					points.push( { x: extrusionZ * arc[0], y: arc[1], z: arc.length > 2 ? arc[2] : 0 } );
				}
			}
    
			if ( i === il - 2 ) {
				points.push( { x: tov.x, y: tov.y, z: tov.z } );
			}
		}

		if( closed ) points.push( points[0] );

		return points;
	}

}