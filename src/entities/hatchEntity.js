import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { SplineEntity } from './splineEntity';

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
	LineSegments } from 'three';

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
				let _drawData = this.drawHatch( entity, entities );
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
	drawHatch( entity, referenceEntities3d ) {
        

		let geometry = null;
		let material = null;

		//CONVERT ENTITIES TO POINTS
		this._calculatePoints( entity );

		//find outer loop, and set all the others as holes
		this._calculateBoxes( entity.boundary );

		if( entity.fillType === 'SOLID' ) {
            
			geometry = this._generateBoundary( entity, referenceEntities3d );
			material = this._colorHelper.getMaterial( entity, 'shape', this.data.tables );
		}
		else if( entity.fillType === 'PATTERN' ) {

			geometry = this._generatePatternGeometry( entity, referenceEntities3d );
			material = this._colorHelper.getMaterial( entity, 'line', this.data.tables );
		}
        
		if( geometry ) this._extrusionTransform( entity, geometry );

		return { geometry: geometry, material: material };		
	}

	_calculatePoints( entity ) {
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

	_generateBoundary( entity, referenceEntities3d ) {

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
		let min = new Vector3( Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE );
		let max = new Vector3( Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE );
		for( let i = 0; i < loop.entities.length; i++ ) {
			const entity = loop.entities[i];
			for( let j = 0; j < entity.points.length; j++ ) {
				const point = entity.points[j];
				min.min( point );
				max.max( point );
			}
		}
		return new Box3( min, max );
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

	_orderEntityPoints( entities ) {
		let ordered = [];
		ordered.push( entities[0] );
		
		let lastEntity = ordered[0];
		while( ordered.length < entities.length ) {

			let entityFirstPoint = lastEntity.points[0];
			let entityLastPoint = lastEntity.points[lastEntity.points.length - 1];
			const initialLengh = ordered.length;
			for ( let i = ordered.length; i < entities.length; i++ ) {
				const entity = entities[i];
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
		return p1.distanceTo( p2 ) < 0.0001;
	}

	_isLoopHole( loop, style ) {
		return style === 1 ? ( loop.type & 16 ) === 16 && ( loop.type & 1 ) !== 1 : true;
	}

	_isLoopOuter( loop ) {
		return ( loop.type & 1 ) === 1 && ( loop.type & 16 ) !== 16;
	}

	_extrusionTransform( entity, geometry ) {
		if( entity.extrusionDir.z < 0 && geometry ) {
			geometry.scale( -1, 1, 1 );
		}
	}

	_generatePatternGeometry( entity, referenceEntities3d ) {
		const pattern = entity.pattern;
		const angleRad = pattern.angle * Math.PI / 180;
		const dir = new Vector2( Math.cos( angleRad ), Math.sin( angleRad ) );
		const perp = new Vector2( -dir.y, dir.x );
		const offsetVec = new Vector2( pattern.offsetX, pattern.offsetY );
		
		let spacing = offsetVec.length();
		if ( spacing === 0 ) spacing = entity.spacing || 1;

		const perpNormalized = perp.clone().normalize();
		const base = new Vector2( pattern.x || 0, pattern.y || 0 );
		const baseProj = base.dot( perpNormalized );

		const boundary = entity.boundary;
		const outerLoop = this._getBiggestLoop( boundary );
		let polygon = this._mergeLoopPoints( outerLoop );

		if ( polygon.length === 0 ) return null;

		if ( this._signedArea( polygon ) < 0 ) {
			polygon.reverse();
		}

		const holeLoops = boundary.loops.filter( loop => loop !== outerLoop && this._isLoopHole( loop, entity.style ) );
		const holePolygons = [];
		for ( let hl of holeLoops ) {
			let hp = this._mergeLoopPoints( hl );
			if ( hp.length > 0 ) holePolygons.push( hp );
		}

		// boundary polygons, to take into account in order to clip the pattern		
		// fill the boundaries with arrays of Vector3 for each geometry an take them into account for positions clipping. 
		// If there is an index in the geometry, take that into account for creating the array from the geometry
		const boundaries = this._collectReferencedPolylines( referenceEntities3d );
		//TODO use them to cut the pattern lines


		let minProj = Infinity;
		let maxProj = -Infinity;
		for ( let p of polygon ) {
			const proj = new Vector2( p.x, p.y ).dot( perpNormalized );
			minProj = Math.min( minProj, proj );
			maxProj = Math.max( maxProj, proj );
		}

		for ( let hole of holePolygons ) {
			for ( let p of hole ) {
				const proj = new Vector2( p.x, p.y ).dot( perpNormalized );
				minProj = Math.min( minProj, proj );
				maxProj = Math.max( maxProj, proj );
			}
		}

		const startK = Math.ceil( ( minProj - baseProj ) / spacing );
		const endK = Math.floor( ( maxProj - baseProj ) / spacing );

		const positions = [];

		for ( let k = startK; k <= endK; k++ ) {
			const offset = baseProj + k * spacing;
			let intersections = [];

			// Intersections with outer
			for ( let i = 0; i < polygon.length; i++ ) {
				this._intersect( polygon, i, perpNormalized, offset, intersections );
			}

			// Intersections with holes
			for ( let hole of holePolygons ) {
				for ( let i = 0; i < hole.length; i++ ) {
					this._intersect( hole, i, perpNormalized, offset, intersections );
				}
			}

			// Sort by projection on dir
			intersections.sort( ( a, b ) => a.dot( dir ) - b.dot( dir ) );

			// Deduplicate intersections
			let uniqueInter = [];
			for ( let int of intersections ) {
				if ( uniqueInter.length === 0 || Math.abs( int.dot( dir ) - uniqueInter[ uniqueInter.length - 1 ].dot( dir ) ) > 1e-6 ) {
					uniqueInter.push( int );
				}
			}
			intersections = uniqueInter;

			// Draw pairs (even-odd rule)
			for ( let j = 0; j < intersections.length; j += 2 ) {
				if ( j + 1 < intersections.length ) {
					const start = intersections[j];
					const end = intersections[j + 1];
					positions.push( start.x, start.y, 0 );
					positions.push( end.x, end.y, 0 );
				}
			}
		}

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );
		return geometry;
	}

	_intersect( arr, i, perpNormalized, offset, intersections = [] ) {
		const p1 = new Vector2( arr[i].x, arr[i].y );
		const p2 = new Vector2( arr[( i + 1 ) % arr.length].x, arr[( i + 1 ) % arr.length].y );
		const den = p2.clone().sub( p1 ).dot( perpNormalized );
		if ( Math.abs( den ) < 1e-6 ) return;
		const num = offset - p1.dot( perpNormalized );
		const t = num / den;
		if ( t >= 0 && t <= 1 ) {
			const intPoint = p1.clone().add( p2.clone().sub( p1 ).multiplyScalar( t ) );
			intersections.push( intPoint );
		}
	}

	_signedArea( points ) {
		let area = 0;
		for ( let i = 0; i < points.length; i++ ) {
			const j = ( i + 1 ) % points.length;
			area += points[i].x * points[j].y;
			area -= points[j].x * points[i].y;
		}
		return area / 2;
	}

	/**
	 * Clip hatch 'positions' by crossings against:
	 *  - the primary outer polygon
	 *  - the hole polygons
	 *  - and extra polylines extracted from referenced boundary geometry
	 *
	 * @param {Array<{x:number,y:number}>} polygon
	 * @param {Array<Array<{x:number,y:number}>>} holePolygons
	 * @param {Float32Array|number[]} positions  // [x0,y0,0, x1,y1,0, ...]
	 * @param {Vector3[][]} referencedPolylines  // output of _collectReferencedPolylines
	 * @param {0|1} style                        // 0=even-odd, 1=non-zero
	 * @returns {Float32Array}
	 */
	_clipPositionsWithReferencedBoundaries( polygon, holePolygons, referencedPolylines, positions, style = 0 ) {
		const EPS = 1e-9;

		const cross = ( a,b ) => a.x*b.y - a.y*b.x;

		function segInterT( p, r, q, s ) {
			const rxs = cross( r, s );
			const qmp = { x: q.x - p.x, y: q.y - p.y };
			if ( Math.abs( rxs ) < EPS ) return null; // parallel or colinear => ignore for cutting
			const t = cross( qmp, s ) / rxs;
			const u = cross( qmp, r ) / rxs;
			if ( t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS ) return Math.min( Math.max( t, 0 ), 1 );
			return null;
		}

		function pointInRing_evenOdd( pt, ring ) {
			let inside = false;
			for ( let i = 0, n = ring.length; i < n; i++ ) {
				const a = ring[i], b = ring[( i+1 )%n];
				const yi = a.y, yj = b.y;
				const xi = a.x, xj = b.x;
				const inter = ( ( yi > pt.y ) !== ( yj > pt.y ) ) &&
                    ( pt.x < ( xj - xi ) * ( pt.y - yi ) / ( yj - yi ) + xi );
				if ( inter ) inside = !inside;
			}
			return inside;
		}
		function pointInRing_nonZero( pt, ring ) {
			let w = 0;
			for ( let i = 0, n = ring.length; i < n; i++ ) {
				const a = ring[i], b = ring[( i + 1 ) % n];
				const ab = { x: b.x - a.x, y: b.y - a.y };
				if ( a.y <= pt.y && b.y >  pt.y && cross( ab, { x: pt.x - a.x, y: pt.y - a.y } ) > 0 ) w++;
				else if ( b.y <= pt.y && a.y > pt.y && cross( ab, { x: pt.x - a.x, y: pt.y - a.y } ) < 0 ) w--;
			}
			return w !== 0;
		}
		const pointInRing = ( style === 1 ) ? pointInRing_nonZero : pointInRing_evenOdd;

		function isInside( pt ) {
			if ( !pointInRing( pt, polygon ) ) return false;
			for ( const h of holePolygons ) if ( pointInRing( pt, h ) ) return false;
			return true;
		}

		function edgesFromRing( ring ) {
			const e = [];
			for ( let i = 0; i < ring.length; i++ ) e.push( [ ring[i], ring[( i+1 )%ring.length] ] );
			return e;
		}
		function edgesFromPolyline( poly ) {
			const e = [];
			for ( let i = 0; i + 1 < poly.length; i++ ) {
				const a = poly[i], b = poly[i+1];
				e.push( [ { x:a.x, y:a.y }, { x:b.x, y:b.y } ] );
			}
			return e;
		}

		// Build one big list of cutting edges
		const outerEdges = edgesFromRing( polygon );
		const holeEdges  = holePolygons.flatMap( edgesFromRing );
		const refEdges   = ( Array.isArray( referencedPolylines ) ? referencedPolylines : [] )
			.flatMap( edgesFromPolyline );

		const allEdges = outerEdges.concat( holeEdges, refEdges );

		// Cut each incoming hatch segment
		const out = [];
		for ( let i = 0; i + 5 < positions.length; i += 6 ) {
			const p0 = { x: positions[i],   y: positions[i+1] };
			const p1 = { x: positions[i+3], y: positions[i+4] };
			const r  = { x: p1.x - p0.x, y: p1.y - p0.y };

			// collect intersection parameters along segment
			const ts = [ 0, 1 ];

			for ( const [ a, b ] of allEdges ) {
				const s = { x: b.x - a.x, y: b.y - a.y };
				const t = segInterT( p0, r, a, s );
				if ( t === null ) continue;
				// dedupe near endpoints
				let dup = false;
				for ( let j = 0; j < ts.length; j++ ) if ( Math.abs( ts[j] - t ) < 1e-8 ) { dup = true; break; }
				if ( !dup ) ts.push( t );
			}

			ts.sort( ( A, B ) => A - B );

			// create subsegments and keep those whose midpoints are inside
			for ( let j = 0; j + 1 < ts.length; j++ ) {
				const t0 = ts[j], t1 = ts[j+1];
				if ( t1 - t0 <= 1e-10 ) continue;
				const mid = ( t0 + t1 ) * 0.5;
				const m = { x: p0.x + r.x * mid, y: p0.y + r.y * mid };
				if ( !isInside( m ) ) continue;

				const A = { x: p0.x + r.x * t0, y: p0.y + r.y * t0 };
				const B = { x: p0.x + r.x * t1, y: p0.y + r.y * t1 };
				out.push( A.x, A.y, 0, B.x, B.y, 0 );
			}
		}

		return new Float32Array( out );
	}


	/**
	 * Convert a THREE.BufferGeometry (indexed or not) into one or more polylines.
	 * Each polyline is returned as an array of THREE.Vector3.
	 * - If geometry has an index, we follow the index order and split when the
	 *   path breaks (non-consecutive jump).
	 * - If no index, we read the position array in order.
	 * - If the geometry represents triangles, this still works because we split
	 *   on breaks; for clean results you should pass line/outline geometries.
	 */
	_geometryToVector3Arrays( geometry ) {
		if ( !geometry ) return [];

		const posAttr = geometry.getAttribute( 'position' );
		if ( !posAttr ) return [];

		const positions = posAttr.array;
		const itemSize = posAttr.itemSize || 3;

		// Helper to push a point from positions array
		const pointAt = ( i, out = new Vector3() ) => {
			const j = i * itemSize;
			return out.set( positions[j], positions[j + 1], positions[j + 2] || 0 );
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
				current.push( pointAt( i, new Vector3() ) );
				last = i;
			}
			if ( current.length > 1 ) polylines.push( current );
		} else {
			// Non-indexed: assume consecutive positions describe a polyline
			const n = Math.floor( positions.length / itemSize );
			const line = [];
			for ( let i = 0; i < n; i++ ) line.push( pointAt( i, new Vector3() ) );
			if ( line.length > 1 ) polylines.push( line );
		}

		return polylines;
	}

	/**
	 * Convert an array of objects that contain `.geometry` into Vector3[][].
	 * Each entry may look like { geometry: BufferGeometry, ... }.
	 * You can pass in any extra fields – they’re ignored.
	 */
	_collectReferencedPolylines( refEntities ) {
		const out = [];
		if ( !Array.isArray( refEntities ) ) return out;
		for ( const ref of refEntities ) {
			if ( !ref || !ref.geometry ) continue;
			const parts = this._geometryToVector3Arrays( ref.geometry );
			for ( const poly of parts ) if ( poly.length > 1 ) out.push( poly );
		}
		return out;
	}

}