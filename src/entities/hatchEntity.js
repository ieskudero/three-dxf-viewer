import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import alphamap from '../../resources/patternAlpha.jpg' ;

import { Vector3, 
	Group,
	Mesh, 
	Shape,
	ShapeGeometry,
	BufferAttribute,
	ArcCurve,
	EllipseCurve,
	MeshBasicMaterial,
	BufferGeometry,
	TextureLoader,
	RepeatWrapping } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * @class HatchEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF hatch entity class.
 */
export class HatchEntity extends BaseEntity {
	constructor( data, font ) { 
		super( data );
		this._font = font;
		this._lineEntity = new LineEntity( data );
	}

	/**
	 * It filters all the hatch entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		let group = new Group();

		//get all hatchs
		let entities = data.entities.filter( entity => entity.type === 'HATCH' );
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
				let _drawData = this.drawHatch( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			if( geometry ) {
                
				let obj = new Mesh( geometry, material );

				obj.userData = entity;
				obj.renderOrder = entity.fillType === 'SOLID' ? -1 : 0;
				obj.position.z = entity.fillType === 'SOLID' ? -0.1 : 0;

				group.add( obj );
			}
		}

		return group;
	}

	/**
	 * Draws a hatch entity.
	 * @param entity {entity} dxf parsed hatch entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawHatch( entity ) {
        

		let geometry = null;
		let material = null;

		//CONVERT ENTITIES TO POINTS
		this._getBoundaryPoints( entity.boundary );

		if( entity.fillType === 'SOLID' ) {
            
			geometry = this._generateBoundary( entity.boundary );
			material = this._getMaterial( entity, 'shape' );
		}
		else if( entity.fillType === 'PATTERN' ) {

			geometry = this._generateBoundary( entity.boundary );
			material = this._getPatternMaterial();
			/*
            geometry = this._generateBoundary( entity.boundary, true );
        
            let lineType = 'line';
            
            if ( entity.lineTypeName ) {
                let ltype = this.data.tables.ltypes[entity.lineTypeName];
                if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
            }

            material = this._getMaterial( entity, lineType );*/
		}
        
		this._extrusionTransform( entity, geometry );

		return { geometry: geometry, material: material };		
	}

	_getBoundaryPoints( boundary ) {
		for ( let i = 0; i < boundary.count; i++ ) {
			const loop = boundary.loops[i];
			for ( let j = 0; j < loop.entities.length; j++ ) {
				let ent = loop.entities[j];
				if( !ent || !ent.type ) continue;

				switch ( ent.type ) {
				case 'LINE' : { this._getLinePoints( ent ); } break;
				case 'POLYLINE': { this._getPolyLinePoints( ent ); } break;
				case 'ARC' : { this._getArcPoints( ent ); } break;
				case 'ELLIPSE' : { this._getEllipsePoints( ent ); } break;
				case 'SPLINE' : { this._getSplinePoints( ent ); } break;
				}
			}
		}
	}

	_getPatternMaterial() {

		if( this.__cachedPatternMaterial ) return this.__cachedPatternMaterial;

		const texture = new TextureLoader().load( alphamap );
		texture.wrapS = RepeatWrapping;
		texture.wrapT = RepeatWrapping;
		texture.repeat.set( 0.1, 0.1 );
		texture.anisotropy = 16;    //should be max of renderer.getMaxAnisotropy()
        
		this.__cachedPatternMaterial = new MeshBasicMaterial( { alphaMap: texture, transparent: true } );
		this.__cachedPatternMaterial.transparent = true;
		this.__cachedPatternMaterial.opacity = 0.2;

		return this.__cachedPatternMaterial;
	}

	_getLinePoints( entity ){
		entity.points = [];
		entity.points.push( new Vector3( entity.start.x, entity.start.y, 0 ) ); 
		entity.points.push( new Vector3( entity.end.x, entity.end.y, 0 ) );
	}

	_getPolyLinePoints( ) {
		//DO NOTHING, POINTS ARE ALREADY ON ENTITY.POINTS
	}

	_getArcPoints( entity ){
		entity.points = [];

		//get all in radians
		let start = entity.startAngle * Math.PI / 180.0;
		let end = entity.endAngle * Math.PI / 180.0;

		let curve = new ArcCurve(
			entity.center.x, entity.center.y,
			entity.radius,
			start,
			end,
			false );    // Always counterclockwise

		let ps = curve.getPoints( 32 );
		for ( let i = 0; i < ps.length; i++ ) entity.points.push( new Vector3( ps[i].x, ps[i].y, 0 ) );
	}

	_getEllipsePoints( entity ){
		entity.points = [];
        
		//get all in radians
		let start = entity.startAngle * Math.PI / 180.0;
		let end = entity.endAngle * Math.PI / 180.0;

		let curve = new EllipseCurve(
			entity.center.x, entity.center.y,
			entity.major.x, entity.major.y,
			start, end,
			false, // Always counterclockwise
			entity.minor );

		let ps = curve.getPoints( 32 );
        
		for ( let i = 0; i < ps.length; i++ ) entity.points.push( new Vector3( ps[i].x, ps[i].y, 0 ) );
	}
    
	_getSplinePoints( entity ){
		entity.points = [];
		//TODO:
		console.log( 'spline arc hatch not done!!' );
	}

	_generateBoundary( boundary, addIndex = false ) {

		let polylineGeos = [];
		let edgeGeos = [];
		let holes = [];

		//add holes first
		for ( let i = 0; i < boundary.loops.length; i++ ) {
			const loop = boundary.loops[i];
     
			if( ( loop.type & 16 ) === 16 ) {               //LOOP IS A HOLE
				let points = this._mergeLoopPoints( loop );
                
				if( points.length > 0 ) 
					holes.push( new Shape().setFromPoints( points ) );

			}
		}
		for ( let i = 0; i < boundary.loops.length; i++ ) {
			const loop = boundary.loops[i];
     
			if( ( loop.type & 1 ) === 1 ) {          //LOOP IS AN OUTER LINE
				let points = this._mergeLoopPoints( loop );
				if( points.length > 0 ) {
					let shape = new Shape();
					shape.setFromPoints( points );
					shape.holes = holes.slice();

					let geometry = null;
					if( addIndex ) {
						geometry = this._createLineGeometry( points );
					} else {
						geometry = new ShapeGeometry( shape );
					}
					edgeGeos.push( geometry );

					holes.length = 0;
				}
			}
		}

        
        
		let polyGeo = polylineGeos.length > 0 ? BufferGeometryUtils.mergeBufferGeometries( polylineGeos, false ) : null;
		let edgeGeo = edgeGeos.length > 0 ? BufferGeometryUtils.mergeBufferGeometries( edgeGeos, false ) : null;

		if( polyGeo && edgeGeo ) 
			return BufferGeometryUtils.mergeBufferGeometries( [ polyGeo, edgeGeo ], false );
		else if( polyGeo )
			return polyGeo;
		else if( edgeGeo )
			return edgeGeo;
		else 
			return null;        
	}

	_createLineGeometry( points ) {
		let geometry = new BufferGeometry();
		let array = new Float32Array( points.length * 3 );
		for ( let j = 0; j < points.length; j++ ) {
			array[j * 3] = points[j].x;
			array[j * 3 + 1] = points[j].y;
			array[j * 3 + 2] = points[j].z;                            
		}
		geometry.setAttribute( 'position', new BufferAttribute( array, 3 ) );
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._generatePointIndex( points ) ), 1 ) );

		return geometry;
	}

	_mergeLoopPoints( loop ) {
		let points = [];
		for ( let i = 0; i < loop.entities.length; i++ ) {
			const entity = loop.entities[i];

			if( !entity ) continue;

			if( entity.type === 'POLYLINE' ) {
				let p = this._lineEntity._getPolyLinePoints( entity.points, entity.closed );
				points = points.concat( p );
			}
			else {
            
				if( !entity.points ) continue;

				let lastPoint = points.length > 0 ? points[points.length - 1] : null;
				for ( let j = 0; j < entity.points.length; j++ ) {
					const point = entity.points[j];
					if( j === 0 && ( lastPoint && lastPoint.x === point.x && lastPoint.y === point.y ) ) continue;
					points.push( point );
				}
			}       
		}
		return points;
	}

	_extrusionTransform( entity, geometry ) {
		if( entity.extrusionDir.z < 0 && geometry ) {
			geometry.scale( -1, 1, 1 );
		}
	}
}