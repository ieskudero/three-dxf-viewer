import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { SplineEntity } from './splineEntity';

import { Vector3, 
	Group,
	Mesh, 
	Shape,
	ShapeGeometry,
	BufferAttribute,
	ArcCurve,
	EllipseCurve,
	BufferGeometry,
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
	MeshBasicMaterial, 
	Box3 } from 'three';

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
		this._splineEntity = new SplineEntity( data );
		this._patternHelper = {
			dir: new Vector3( 0,1,0 ),
		};
	}

	/**
	 * It filters all the hatch entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		let group = new Group();
		group.name = 'HATCHES';
				
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

				obj.userData = { entity: entity };
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
		this._getBoundaryPoints( entity );
		geometry = this._generateBoundary( entity );

		if( entity.fillType === 'SOLID' ) {
            
			material = this._colorHelper.getMaterial( entity, 'shape', this.data.tables );
		}
		else if( entity.fillType === 'PATTERN' ) {

			material = this._getPatternMaterial( entity );
			/*
        
            let lineType = 'line';
            
            if ( entity.lineTypeName ) {
                let ltype = this.data.tables.ltypes[entity.lineTypeName];
                if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
            }

            material = this._colorHelper.getMaterial( entity, lineType, this.data.tables );*/
		}
        
		this._extrusionTransform( entity, geometry );

		return { geometry: geometry, material: material };		
	}

	_getBoundaryPoints( entity ) {
		const boundary = entity.boundary;
		for ( let i = 0; i < boundary.count; i++ ) {
			const loop = boundary.loops[i];
			for ( let j = 0; j < loop.entities.length; j++ ) {
				let ent = loop.entities[j];
				if( !ent || !ent.type ) continue;

				switch ( ent.type ) {
				case 'LINE' : { this._getLinePoints( ent ); } break;
				case 'POLYLINE': { this._getPolyLinePoints( ent ); } break;
				case 'ARC' : { this._getArcPoints( ent, entity ); } break;
				case 'ELLIPSE' : { this._getEllipsePoints( ent ); } break;
				case 'SPLINE' : { this._getSplinePoints( ent ); } break;
				}
			}
		}
	}

	_getPatternMaterial( entity ) {

		if( this.__cachedPatternMaterial ) return this.__cachedPatternMaterial;

		const pattern = entity.pattern;

		this._patternHelper.dir.applyAxisAngle( new Vector3( 0,0,1 ), pattern.angle * Math.PI / 180 );
		
		this.__cachedPatternMaterial = new MeshBasicMaterial();
		this.__cachedPatternMaterial.transparent = true;

		this.__cachedPatternMaterial.color.setHex( this._colorHelper._getColorHex( entity, this.data.tables.layers ) );
		this.__cachedPatternMaterial.color.convertSRGBToLinear();

		this.__cachedPatternMaterial.onBeforeCompile = shader => {

			shader.vertexShader = `
			  varying vec4 vPos;
			  varying vec4 vCenter;
			  ${shader.vertexShader}
			`.replace( '#include <begin_vertex>', `
						#include <begin_vertex>
						vPos = modelMatrix * vec4(position, 1.);
						vCenter = modelMatrix * vec4(0);
			` );
			shader.fragmentShader = `
			  #define ss(a, b, c) smoothstep(a, b, c)
			  varying vec4 vPos;
			  varying vec4 vCenter;
			  ${shader.fragmentShader}
			`.replace( 'vec4 diffuseColor = vec4( diffuse, opacity );',`
			  vec3 col = diffuse;
			  vec3 dir = normalize(vec3(${this._patternHelper.dir.x}, ${this._patternHelper.dir.y}, 0.));
			  float dist = fract(dot(vPos.xyz * 2., dir));
			  float fw = length(fwidth(vPos.xy));
			  float line_size = 0.3;
			  float empty_size = 1.0 - line_size;
			  float f = ss(line_size - fw, line_size, dist) - ss(empty_size, empty_size + fw, dist);
			  col = mix(col , col * 0., f);
			  vec4 diffuseColor = vec4( col, opacity );
			  ` );
		};

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

	_getArcPoints( entity, hatch ){
		entity.points = [];

		//get all in radians
		let start = entity.startAngle * Math.PI / 180.0;
		let end = entity.endAngle * Math.PI / 180.0;

		//sweep if necessary
		if ( !entity.counterClockWise && hatch.extrusionDir.z > 0 ) {
			const temp = -start;
			start = -end;
			end = temp;
		}

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
		entity.points = this._splineEntity.getBSplinePolyline( 
			entity.controlPoints.points,
			entity.degree,
			entity.knots.knots,
			entity.weights
		);
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

        
        
		let polyGeo = polylineGeos.length > 0 ? BufferGeometryUtils.mergeGeometries( polylineGeos, false ) : null;
		let edgeGeo = edgeGeos.length > 0 ? BufferGeometryUtils.mergeGeometries( edgeGeos, false ) : null;

		if( polyGeo && edgeGeo ) 
			return BufferGeometryUtils.mergeGeometries( [ polyGeo, edgeGeo ], false );
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
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._geometryHelper.generatePointIndex( points ) ), 1 ) );

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