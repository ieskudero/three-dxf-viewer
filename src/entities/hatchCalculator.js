// Robust loop-based hatch clipper similar in spirit to vagran/dxf-viewer:
// https://github.com/vagran/dxf-viewer
// Implements 3 island detection styles: ODD_PARITY, OUTERMOST, THROUGH_ENTIRE_AREA.
//
// Usage:
//   const calc = new HatchCalculator(loops, HatchStyle.ODD_PARITY);
//   const spans = calc.ClipLine([ {x:..,y:..}, {x:..,y:..} ]);
//
// Notes:
// - Works entirely in "line space": X axis along the incoming line direction, Y axis along its normal.
// - Handles vertex hits with standard scanline half-open rule (yi <= y0 < yj) and ignores horizontal edges.
// - OUTERMOST and THROUGH_ENTIRE_AREA are implemented as "depth >= 1".
// Matches AutoCAD's docs for island detection semantics.

export const HatchStyle = {
	ODD_PARITY: 0,
	OUTERMOST: 1,
	THROUGH_ENTIRE_AREA: 2,
};

const EPS = 1e-9;

function dot( a,b ){ return a.x*b.x + a.y*b.y; }
function sub( a,b ){ return { x:a.x-b.x, y:a.y-b.y }; }
function add( a,b ){ return { x:a.x+b.x, y:a.y+b.y }; }
function mul( a,s ){ return { x:a.x*s, y:a.y*s }; }
function len( a ){ return Math.hypot( a.x, a.y ); }

export class HatchCalculator {
	constructor( loops, style = HatchStyle.ODD_PARITY ) {
		// loops: array of arrays of {x,y}. They may be open or closed; we'll close them.
		this.loops = ( loops||[] ).map( loop => {
			const out = loop.slice();
			if ( out.length >= 2 ) {
				const f = out[0], l = out[out.length-1];
				if ( Math.abs( f.x - l.x ) > EPS || Math.abs( f.y - l.y ) > EPS ) out.push( { x:f.x, y:f.y } );
			}
			return out;
		} );
		this.style = style;
	}

	// Even-odd PIP test for a single loop
	_pointInLoop( P, loop ) {
		let inside = false;
		for ( let i=0, j=loop.length-1; i<loop.length; j=i++ ) {
			const xi = loop[i].x, yi = loop[i].y;
			const xj = loop[j].x, yj = loop[j].y;
			const intersect = ( ( yi > P.y ) !== ( yj > P.y ) ) &&
                        ( P.x < ( xj - xi ) * ( P.y - yi ) / ( yj - yi + 1e-30 ) + xi );
			if ( intersect ) inside = !inside;
		}
		return inside;
	}

	// Return how many loops contain P (even-odd per loop)
	_depthAt( P ) {
		let count = 0;
		for ( const loop of this.loops ) if ( this._pointInLoop( P, loop ) ) count++;
		return count;
	}

	// Clip a segment [P0,P1] by the collection of loops.
	// Returns an array of [t0, t1] with 0<=t0<t1<=1.
	ClipLine( [ P0, P1 ] ) {
		const dir = sub( P1, P0 );
		const L = len( dir );
		if ( L < EPS ) return [];
		const dirU = { x: dir.x / L, y: dir.y / L };
		const nrmU = { x: -dirU.y, y: dirU.x };
		const x0 = 0, x1 = L;

		// Transform function to line space
		const toLine = ( p ) => {
			const v = sub( p, P0 );
			return { x: dot( v, dirU ), y: dot( v, nrmU ) };
		};

		// Gather intersections with horizontal line y = 0
		const xs = [];
		for ( const loop of this.loops ) {
			for ( let i=0; i+1<loop.length; i++ ) {
				const A = toLine( loop[i] ), B = toLine( loop[i+1] );
				const dy = B.y - A.y;
				if ( Math.abs( dy ) < EPS ) continue; // horizontal edge
				// half-open rule
				if ( !( ( A.y <= 0 && 0 < B.y ) || ( B.y <= 0 && 0 < A.y ) ) ) continue;
				const t = ( 0 - A.y ) / dy;
				const x = A.x + t * ( B.x - A.x );
				xs.push( x );
			}
		}

		if ( !xs.length ) return [];
		xs.sort( ( a,b )=>a-b );
		const uniq = [];
		let last = null;
		for ( const x of xs ) {
			if ( last===null || Math.abs( x-last ) > 1e-7 ) uniq.push( x );
			last = x;
		}

		const spans = [];
		if ( this.style === HatchStyle.ODD_PARITY ) {
			for ( let i=0; i+1<uniq.length; i+=2 ) {
				const a = Math.max( x0, uniq[i] );
				const b = Math.min( x1, uniq[i+1] );
				if ( b - a > 1e-9 ) spans.push( [ ( a-x0 )/( x1-x0 ), ( b-x0 )/( x1-x0 ) ] );
			}
			return spans;
		}

		// OUTERMOST or THROUGH_ENTIRE_AREA
		const cuts = [ x0 ];
		for ( const x of uniq ) if ( x > x0+1e-9 && x < x1-1e-9 ) cuts.push( x );
		cuts.push( x1 );
		for ( let i=0; i+1<cuts.length; i++ ) {
			const a = cuts[i], b = cuts[i+1];
			if ( b - a <= 1e-9 ) continue;
			const mid = ( a+b )*0.5;
			const M = add( P0, mul( dirU, mid ) );
			const depth = this._depthAt( M );
			let inside = false;
			if ( this.style === HatchStyle.THROUGH_ENTIRE_AREA ) {
				inside = depth >= 1;
			} else { // OUTERMOST
				inside = depth >= 1;
			}
			if ( inside ) spans.push( [ ( a-x0 )/( x1-x0 ), ( b-x0 )/( x1-x0 ) ] );
		}
		return spans;
	}
}
