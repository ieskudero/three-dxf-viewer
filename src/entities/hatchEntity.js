import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { SplineEntity } from './splineEntity';

import { HatchCalculator, HatchStyle } from './hatchCalculator.js';

import { Vector3, 
	Vector2,
	Group,
	Mesh, 
	Shape,
	ShapeGeometry,
	ArcCurve,
	EllipseCurve,
	Box3,
	BufferGeometry,
	Float32BufferAttribute,
	LineSegments, 
	BufferAttribute } from 'three';

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
			dir: new Vector2(),
			nrm: new Vector2(),
			offsetVec: new Vector2(),
			base: new Vector2()
		};
		this._boxHelper = {
			min: new Vector3(),
			max: new Vector3()
		};
	}

	/**
	 * It filters all the hatch entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data, getRefEntity3ds ) {
        
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
				let _drawData = this.drawHatch( entity, getRefEntity3ds );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			if( geometry ) {
                
				let obj = entity.fillType === 'SOLID' ? new Mesh( geometry, material ) : new LineSegments( geometry, material );

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
	drawHatch( entity, getRefEntity3ds ) {
        

		let geometry = null;
		let material = null;

		//CONVERT ENTITIES TO POINTS
		this._calculatePoints( entity );

		//set boundary types
		entity.boundary.loops.forEach( loop => this._setBoundaryTypes( loop ) );

		//reorder: external first, outermost second
		entity.boundary.loops.sort( ( a, b ) => {
			if ( a.bType.external != b.bType.external ) {
				return a.bType.external ? -1 : 1;
			}
			if ( a.bType.outermost != b.bType.outermost ) {
				return a.bType.outermost ? -1 : 1;
			}
			return 0;
		} );

		//based on style, remove loops. 
		// 2 = Hatch through entire area (Ignore style), 
		// 1 = Hatch outermost area only (Outer style),
		// 0 = Hatch “odd parity” area (Normal style) 
		switch( entity.style ) {
		case 2: entity.boundary.loops = [ entity.boundary.loops[0] ]; break;
		case 1: entity.boundary.loops = entity.boundary.loops.filter( loop => loop.bType.external || loop.bType.outermost ); break;
		}

		//find outer loop, and set all the others as holes
		this._calculateBoxes( entity.boundary );

		if( entity.fillType === 'SOLID' ) {
            
			geometry = this._generateBoundary( entity, getRefEntity3ds );
			material = this._colorHelper.getMaterial( entity, 'shape', this.data.tables );
		}
		else if( entity.fillType === 'PATTERN' ) {

			geometry = this._generatePatternGeometry( entity, getRefEntity3ds );
			material = this._colorHelper.getMaterial( entity, 'line', this.data.tables );
		}
        
		if( geometry ) this._extrusionTransform( entity, geometry );

		return { geometry: geometry, material: material };		
	}

	_calculatePoints( entity ) {
		const boundary = entity.boundary;
		for ( let i = 0; i < boundary.loops.length; i++ ) {
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

	_getLinePoints( entity ){
		entity.points = [];
		entity.points.push( { x: entity.start.x, y: entity.start.y, z: 0 } ); 
		entity.points.push( { x: entity.end.x, y: entity.end.y, z: 0 } );
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
		for ( let i = 0; i < ps.length; i++ ) entity.points.push( { x: ps[i].x, y: ps[i].y, z: 0 } );
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
        
		for ( let i = 0; i < ps.length; i++ ) entity.points.push( { x: ps[i].x, y: ps[i].y, z: 0 } );
	}
    
	_getSplinePoints( entity ){
		entity.points = this._splineEntity.getBSplinePolyline( 
			entity.controlPoints.points,
			entity.degree,
			entity.knots.knots,
			entity.weights
		);
	}

	_generateBoundary( entity, /*getRefEntity3ds*/ ) {

		const boundary = entity.boundary;

		//get biggest loop
		const outerLoop = this._getBiggestLoop( boundary );

		//get hole loops
		const holeLoops = boundary.loops.filter( loop => loop !== outerLoop && this._isLoopHole( loop, entity.style ) );

		//create outer shape
		const outerPoints = this._mergeLoopPoints( outerLoop );
		if( outerPoints.length === 0 ) return null;

		const shape = new Shape();
		shape.setFromPoints( outerPoints );

		//create hole shapes
		for( let i = 0; i < holeLoops.length; i++ ) {
			const holePoints = this._mergeLoopPoints( holeLoops[i] );
			if( holePoints.length === 0 ) continue;
			const hole = new Shape();
			hole.setFromPoints( holePoints );
			shape.holes.push( hole );
		}

		//return geometry
		return new ShapeGeometry( shape );
	}

	_calculateBoxes( boundary ) {
		for( let i = 0; i < boundary.loops.length; i++ ) {
			const loop = boundary.loops[i];
			loop.box = this._getLoopBox( loop );
		}
	}

	_getLoopBox( loop ) {
		this._boxHelper.min.set( Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE );
		this._boxHelper.max.set( Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE );
		for( let i = 0; i < loop.entities.length; i++ ) {
			const entity = loop.entities[i];
			for( let j = 0; j < entity.points.length; j++ ) {
				const point = entity.points[j];
				this._boxHelper.min.min( point );
				this._boxHelper.max.max( point );
			}
		}
		return new Box3( this._boxHelper.min, this._boxHelper.max );
	}

	_setBoundaryTypes( boundary ) {

		//boundary path types
		// 0 = Default; 1 = External; 2 = Polyline; 4 = Derived; 8 = Textbox; 16 = Outermost
		boundary.bType = {
			external: ( boundary.type & 1 ) != 0,
			polyline: ( boundary.type & 2 ) != 0,
			derived: ( boundary.type & 4 ) != 0,
			textbox: ( boundary.type & 8 ) != 0,
			outermost: ( boundary.type & 16 ) != 0
		};

		//edge types
		// Polyline --> 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline
		boundary.eType = {
			polyline: typeof boundary.hasBulge !== 'undefined',
			line: typeof boundary.hasBulge !== 'undefined' ? boundary.hasBulge === 1 : boundary.edgeType === 1,
			circulararc: typeof boundary.hasBulge !== 'undefined' ? boundary.hasBulge === 2 : boundary.edgeType === 2,
			ellipticarc: typeof boundary.hasBulge !== 'undefined' ? boundary.hasBulge === 3 : boundary.edgeType === 3,
			spline: typeof boundary.hasBulge !== 'undefined' ? boundary.hasBulge === 4 : boundary.edgeType === 4,
		};

	}

	_getBiggestLoop( boundary ) {
		
		if( boundary.loops.length === 1 ) return boundary.loops[0];

		let outerLoop = boundary.loops[0];
		let outerLoopArea = this._getLoopArea( outerLoop );
		for( let i = 1; i < boundary.loops.length; i++ ) {
			const loop = boundary.loops[i];
			const area = this._getLoopArea( loop );
			if( area > outerLoopArea ) {
				outerLoop = loop;
				outerLoopArea = area;
			}
		}

		return outerLoop;
	}

	_getLoopArea( loop ) {
		let area = 0;
		
		//calculate area using box size
		const box = loop.box;
		area = ( box.max.x - box.min.x ) * ( box.max.y - box.min.y );

		return area;
	}

	_mergeLoopPoints( loop ) {
		let points = [];

		const entities = this._orderEntityPoints( loop.entities );

		if( !entities ) {
			console.warn( 'loops with separated entities not supproted yet' );
			return points;
		}

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			if( !entity ) continue;

			if( entity.type === 'POLYLINE' ) {
				let p = this._lineEntity._getPolyLinePoints( entity.points, entity.closed );
				points = points.concat( p );
			}
			else {
            
				if( !entity.points ) continue;

				let lastPoint = entity.points.length > 0 ? entity.points[entity.points.length - 1] : null;
				for ( let j = 0; j < entity.points.length; j++ ) {
					const point = entity.points[j];
					if( j === 0 && ( lastPoint && lastPoint.x === point.x && lastPoint.y === point.y ) ) continue;
					points.push( point );
				}
			}       
		}
		return points;
	}

	_orderEntityPoints( entities ) {
		let ordered = [];

		const noEmptyEntities = entities.filter( entity => entity.points && entity.points.length > 0 );
		if( noEmptyEntities.length === 0 ) return [];
		
		ordered.push( noEmptyEntities[0] );

		let lastEntity = noEmptyEntities[0];
		while( ordered.length < noEmptyEntities.length ) {

			let entityFirstPoint = lastEntity.points[0];
			let entityLastPoint = lastEntity.points[lastEntity.points.length - 1];
			const initialLengh = ordered.length;
			for ( let i = ordered.length; i < noEmptyEntities.length; i++ ) {
				const entity = noEmptyEntities[i];
				if( !entity ) continue;
				if( this._samePoints( entityLastPoint, entity.points[0] ) ) {
					ordered.push( entity );
					lastEntity = entity;
					break;
				}
				if( this._samePoints( entityLastPoint, entity.points[entity.points.length - 1] ) ) {
					entity.points.reverse();
					ordered.push( entity );
					lastEntity = entity;
					break;
				}
				if( this._samePoints( entityFirstPoint, entity.points[0] ) ) {
					for( let j = 0; j < ordered.length; j++ ) ordered[j].points.reverse();
					ordered.push( entity );
					lastEntity = entity;
					break;
				}
				if( this._samePoints( entityFirstPoint, entity.points[entity.points.length - 1] ) ) {
					for( let j = 0; j < ordered.length; j++ ) ordered[j].points.reverse();
					entity.points.reverse();
					ordered.push( entity );
					lastEntity = entity;
					break;
				}
			}

			if( initialLengh === ordered.length ) 
				return null;
		}

		return ordered;
	}

	_samePoints( p1, p2 ) {
		const dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
		const square = dx * dx + dy * dy + dz * dz;

		return Math.sqrt( square ) < 0.0001;
	}

	_isLoopHole( loop, style ) {
		return style === 1 ? ( loop.type & 16 ) === 16 && ( loop.type & 1 ) !== 1 : true;
	}

	_extrusionTransform( entity, geometry ) {
		if( entity.extrusionDir.z < 0 && geometry ) {
			geometry.scale( -1, 1, 1 );
		}
	}

	_generatePatternGeometry( entity, getRefEntity3ds ) {
		const pattern = entity.pattern || {};
		const angle = ( pattern.angle || 0 ) * Math.PI / 180;
		this._patternHelper.dir.set( Math.cos( angle ), Math.sin( angle ) ); 
		this._patternHelper.nrm.set( -this._patternHelper.dir.y, this._patternHelper.dir.x );
		const dir = this._patternHelper.dir;
		const nrm = this._patternHelper.nrm;

		this._patternHelper.offsetVec.set( pattern.offsetX || 0, pattern.offsetY || 0 );
		let spacing = Math.abs( this._patternHelper.offsetVec.x * nrm.x + this._patternHelper.offsetVec.y * nrm.y );
		if ( spacing < 1e-9 ) spacing = entity.spacing || 1;

		this._patternHelper.base.set( pattern.x || 0, pattern.y || 0 );
		const baseProj = this._patternHelper.base.dot( nrm );

		const boundary = entity.boundary;
		if ( !boundary || !Array.isArray( boundary.loops ) || boundary.loops.length === 0 ) return null;


		// Convert Vector2/3 -> plain {x,y}
		const v2plain = ( arr ) => arr.map( p => ( { x: p.x, y: p.y } ) );

		// ---------- build all loops (use references when present) ----------
		const allLoops = [];

		for ( const loop of boundary.loops ) {
			let ringsFromRefs = [];
			if ( Array.isArray( loop.references ) && loop.references.length ) {
				const refEntities = getRefEntity3ds( loop.references );
				const refPolys = this._getPointsFromEntities( refEntities ) || [];

				// Connect them into rings
				const plainPieces = refPolys
					.filter( p => p.length >= 2 );

				ringsFromRefs = this._stitchPolylines( plainPieces );
			}

			if ( ringsFromRefs.length ) {
				for ( const ring of ringsFromRefs ) {
					allLoops.push( ring );
				}
			} else {
				// Fallback: single merged ring from loop.entities
				const ringPts = this._mergeLoopPoints( loop );
				if ( ringPts && ringPts.length >= 3 ) {
					const clean = this._cleanPolyline( v2plain( ringPts ) );
					if ( clean.length >= 3 ) allLoops.push( clean );
				}
			}
		}

		if ( allLoops.length === 0 ) return null;

		// ---------- extents along (dir, nrm) ----------
		let minS = Infinity, maxS = -Infinity, minN = Infinity, maxN = -Infinity;
		for ( const loop of allLoops ) {
			for ( const v of loop ) {
				const s = v.x * dir.x + v.y * dir.y;
				const t = v.x * nrm.x + v.y * nrm.y;
				if ( s < minS ) minS = s; if ( s > maxS ) maxS = s;
				if ( t < minN ) minN = t; if ( t > maxN ) maxN = t;
			}
		}

		const startK = Math.ceil( ( minN - baseProj ) / spacing );
		const endK   = Math.floor( ( maxN - baseProj ) / spacing );

		// ---------- loop-aware clipping ---------- //
		const styleMap = { 0: HatchStyle.ODD_PARITY, 1: HatchStyle.OUTERMOST, 2: HatchStyle.THROUGH_ENTIRE_AREA };
		const calc = new HatchCalculator( allLoops, styleMap[entity.style] ?? HatchStyle.ODD_PARITY );

		const positions = [];
		const margin = 1;

		const lineCount = endK - startK;
		let incr = lineCount > 1000 ? Math.ceil( lineCount / 1000 ): 1;  //limit to 1000 incrementing more than one
		const p0 = new Vector2();
		const p1 = new Vector2();
		for ( let k = startK; k <= endK; k+=incr ) {
			const t = baseProj + k * spacing;
			const s0 = minS - margin, s1 = maxS + margin;

			p0.set( dir.x * s0 + nrm.x * t, dir.y * s0 + nrm.y * t );
			p1.set( dir.x * s1 + nrm.x * t, dir.y * s1 + nrm.y * t );

			const spans = calc.ClipLine( [ { x: p0.x, y: p0.y }, { x: p1.x, y: p1.y } ] );
			for ( const [ a, b ] of spans ) {
				const A = p0.clone().lerp( p1, a );
				const B = p0.clone().lerp( p1, b );
				positions.push( A.x, A.y, 0, B.x, B.y, 0 );
			}
		}

		if ( !positions.length ) return null;

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );
		const count = geometry.attributes.position.count;

		//set index in pairs
		const index = [];
		for ( let i = 0; i < count; i += 2 ) {
			index.push( i, i + 1 );
		}
		geometry.setIndex( new BufferAttribute( new Uint16Array( index ), 1 ) );
		return geometry;
	}

	_stitchPolylines( polys ) {

		// ---------- helpers ----------
		const EPS = 1e-6;
		const vEq = ( a, b ) => Math.abs( a.x - b.x ) < EPS && Math.abs( a.y - b.y ) < EPS;

		const unused = polys.map( this._cleanPolyline ).filter( p => p.length > 0 );
		const rings = [];

		while ( unused.length ) {
			// start a new path with the first available polyline
			let path = unused.shift().slice();
			let extended = true;

			// keep appending until we either close or can't extend
			while ( extended ) {
				extended = false;

				for ( let i = 0; i < unused.length; i++ ) {
					const seg = unused[i];
					const head = path[0];
					const tail = path[path.length - 1];
					const a0 = seg[0];
					const a1 = seg[seg.length - 1];

					if ( vEq( tail, a0 ) ) {
						// ...tail -> seg forward
						path = path.concat( seg.slice( 1 ) );
						unused.splice( i, 1 );
						extended = true;
						break;
					}
					if ( vEq( tail, a1 ) ) {
						// ...tail -> reversed(seg)
						path = path.concat( seg.slice( 0, -1 ).reverse() );
						unused.splice( i, 1 );
						extended = true;
						break;
					}
					if ( vEq( head, a1 ) ) {
						// reversed(seg) -> head...
						path = seg.slice( 0, -1 ).concat( path );
						unused.splice( i, 1 );
						extended = true;
						break;
					}
					if ( vEq( head, a0 ) ) {
						// seg -> head...
						path = seg.slice( 1 ).reverse().concat( path );
						unused.splice( i, 1 );
						extended = true;
						break;
					}
				}
			}

			// close if endpoints coincide; otherwise, drop if not a proper ring
			if ( path.length >= 3 && vEq( path[0], path[path.length - 1] ) ) path.pop();
			if ( path.length >= 3 ) rings.push( path );
			// if it didn't close, we treat it as not a hatch boundary and skip
		}

		return rings;
	}

	_cleanPolyline( poly ) {
		if ( !poly || poly.length < 2 ) return [];
		
		// ---------- helpers ----------
		const EPS = 1e-6;
		const vEq = ( a, b ) => Math.abs( a.x - b.x ) < EPS && Math.abs( a.y - b.y ) < EPS;
		
		const out = [ poly[0] ];
		for ( let i = 1; i < poly.length; i++ ) {
			const p = poly[i], q = out[out.length - 1];
			if ( !vEq( p, q ) ) out.push( p );
		}
		if ( out.length >= 3 && vEq( out[0], out[out.length - 1] ) ) {
			// closed, remove duplicate last
			out.pop();
		}
		return out;
	}

	/**
	 * Convert a THREE.BufferGeometry (indexed or not) into one or more polylines.
	 * Each polyline is returned as an array of THREE.Vector2.
	 * - If geometry has an index, we follow the index order and split when the
	 *   path breaks (non-consecutive jump).
	 * - If no index, we read the position array in order.
	 * - If the geometry represents triangles, this still works because we split
	 *   on breaks; for clean results you should pass line/outline geometries.
	 */
	_geometryToVector2Arrays( geometry ) {
		if ( !geometry ) return [];

		const posAttr = geometry.getAttribute( 'position' );
		if ( !posAttr ) return [];

		const positions = posAttr.array;
		const itemSize = posAttr.itemSize || 3;

		// Helper to push a point from positions array
		const pointAt = ( i ) => {
			const j = i * itemSize;
			return { x: positions[j], y: positions[j + 1] };
		};

		const polylines = [];

		if ( geometry.index && geometry.index.count ) {
			// Indexed geometry
			const idx = geometry.index.array;
			let current = [];
			let last = -1;

			for ( let k = 0; k < idx.length; k++ ) {
				const i = idx[k];

				// New strip if jump in index (prevents accidental stitching through triangles)
				if ( last >= 0 && Math.abs( i - last ) > 1 ) {
					if ( current.length > 1 ) polylines.push( current );
					current = [];
				}
				current.push( pointAt( i ) );
				last = i;
			}
			if ( current.length > 1 ) polylines.push( current );
		} else {
			// Non-indexed: assume consecutive positions describe a polyline
			const n = Math.floor( positions.length / itemSize );
			const line = [];
			for ( let i = 0; i < n; i++ ) line.push( pointAt( i ) );
			if ( line.length > 1 ) polylines.push( line );
		}

		return polylines;
	}

	/**
	 * Convert an array of objects that contain `.geometry` into Vector2[][].
	 * Each entry may look like { geometry: BufferGeometry, ... }.
	 * You can pass in any extra fields – they’re ignored.
	 */
	_getPointsFromEntities( refEntities ) {
		const out = [];
		if ( !Array.isArray( refEntities ) ) return out;
		for ( const ref of refEntities ) {
			if ( !ref || !ref.geometry ) continue;
			const parts = this._geometryToVector2Arrays( ref.geometry );
			for ( const poly of parts ) if ( poly.length > 1 ) out.push( poly );
		}
		return out;
	}

}