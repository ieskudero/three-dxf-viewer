import { CanvasTexture } from 'three';
import  { WMFJS } from 'rtf.js'; 

// GDI map mode constants (match your Helper.GDI.MapMode if you prefer importing)
const MM_TEXT        = 1;
const MM_LOMETRIC    = 2;
const MM_HIMETRIC    = 3;
const MM_LOENGLISH   = 4;
const MM_HIENGLISH   = 5;
const MM_TWIPS       = 6;
const MM_ISOTROPIC   = 7;
const MM_ANISOTROPIC = 8;

export class Ole2FrameWMFRenderer {
	constructor( entity ) {
		this.entity = entity;
		WMFJS.loggingEnabled( false );
	}

	async render( wmfBytes,options = { dpi: 96, rasterScale: 2 } ) {
		const dpi = options?.dpi ?? 96;
		const scale = options?.rasterScale ?? 1; // e.g., 2 for hi-res rasterization
		const svgEl = this.renderWmfToSvgElement( wmfBytes, dpi );
	
		// For debug only: append to page
		document.body.appendChild( svgEl );
	
		// Optional upscaling for sharper textures
		const vb = svgEl.getAttribute( 'viewBox' )?.split( /\s+/ ).map( Number ) || [ 0,0,512,512 ];
		const baseW = vb[2] || 512;
		const baseH = vb[3] || 512;
		const canvas = await this.rasterizeSvgToCanvas( svgEl, Math.round( baseW * scale ), Math.round( baseH * scale ), options?.fillWhite ?? true );
	
		const texture = new CanvasTexture( canvas );
	
		return texture;
	}

	async rasterizeSvgToCanvas( svgEl, width, height, fillWhite = true ) {
		// 1) Serialize SVG to a Blob URL
		const svgString = new XMLSerializer().serializeToString( svgEl );
		const svgBlob = new Blob( [ svgString ], { type: 'image/svg+xml' } );
		const url = URL.createObjectURL( svgBlob );
	
		// 2) Load as <img>
		const img = await this._loadImg( url );
	
		// 3) Determine raster size (from viewBox or provided overrides)
		let w = width, h = height;
		if ( !w || !h ) {
			const m = /viewBox="([\d.\s-]+)"/.exec( svgString );
			if ( m ) {
				const [ , vbox ] = m;
				const [ , , vbW, vbH ] = vbox.trim().split( /\s+/ ).map( Number );
				if ( !w ) w = Math.max( 1, Math.round( vbW ) );
				if ( !h ) h = Math.max( 1, Math.round( vbH ) );
			} else {
				w = w || img.naturalWidth  || 1024;
				h = h || img.naturalHeight || 1024;
			}
		}
	
		// 4) Draw onto canvas
		const canvas = document.createElement( 'canvas' );
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext( '2d' );
		if ( fillWhite ) {
			ctx.fillStyle = '#fff';
			ctx.fillRect( 0, 0, canvas.width, canvas.height );
		}
		ctx.drawImage( img, 0, 0, canvas.width, canvas.height );
	
		URL.revokeObjectURL( url );
		return canvas;
	}

	async _loadImg( url ) {
		return new Promise( ( resolve, reject ) => {
			const image = new Image();
			image.onload = () => 
			{
				resolve( image );
			};
			image.onerror = ( e ) => 
			{
				reject( e );
			};
			image.src = url;
		} );
	}
	
	renderWmfToSvgElement( wmfBytes, dpi = 96 ) {
		const renderer = new WMFJS.Renderer( wmfBytes );
		const settings = this.getIRendererSettingsFromWMF( wmfBytes, { dpi: dpi } );
		return renderer.render( settings ); // returns <svg>
	}
	
	getIRendererSettingsFromWMF( buf, opts ) {
		const dpi = opts?.dpi ?? 96;
		const view = buf instanceof Uint8Array ? new DataView( buf.buffer, buf.byteOffset, buf.byteLength )
			: new DataView( buf );
	
		// Look for Aldus Placeable Metafile signature 0x9AC6CDD7 (little-endian)
		// It can be at offset 0; if not, scan a little to be safe.
		let off = 0;
		const sig = 0x9AC6CDD7;
		let found = false;
		const maxScan = Math.min( view.byteLength - 22, 256 ); // header is 22 bytes; don't scan forever
		for ( let i = 0; i <= maxScan; i += 2 ) { // align on 2 bytes (header uses 16-bit fields)
			if ( view.getUint32( i, true ) === sig ) { off = i; found = true; break; }
		}
	
		if ( found ) {
			// Placeable header layout (22 bytes total):
			//  0  DWORD key = 0x9AC6CDD7
			//  4  WORD  handle (unused, skip)
			//  6  RECT  boundingBox: left, top, right, bottom (each INT16)
			// 14  WORD  unitsPerInch (INT16)
			// 16  DWORD reserved (skip)
			// 20  WORD  checksum (skip)
			const left   = view.getInt16( off + 6,  true );
			const top    = view.getInt16( off + 8,  true );
			const right  = view.getInt16( off + 10, true );
			const bottom = view.getInt16( off + 12, true );
			const unitsPerInch = view.getInt16( off + 14, true );
	
			const xExt = Math.max( 1, right - left );
			const yExt = Math.max( 1, bottom - top );
	
			// Convert logical extents to CSS pixels
			const pxW = Math.max( 1, Math.round( ( xExt / unitsPerInch ) * dpi ) );
			const pxH = Math.max( 1, Math.round( ( yExt / unitsPerInch ) * dpi ) );
	
			return {
				width:  `${pxW}px`,
				height: `${pxH}px`,
				xExt,
				yExt,
				mapMode: MM_ANISOTROPIC
			};
		}
	
		// Fallback if there is no placeable header:
		// Many WMFs also set WINDOWEXT/VIEWPORTEXT in the record stream,
		// but parsing that is more work. Use a conservative default:
		const fbW = opts?.fallbackPx?.width  ?? 512;
		const fbH = opts?.fallbackPx?.height ?? 512;
		return {
			width:  `${fbW}px`,
			height: `${fbH}px`,
			xExt: fbW,
			yExt: fbH,
			mapMode: MM_ANISOTROPIC
		};
	}
}