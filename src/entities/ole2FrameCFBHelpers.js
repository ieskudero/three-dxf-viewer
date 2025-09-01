export class Ole2FrameCFBHelpers {
	constructor(){
		this.cfbSig = [ 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 ];
	}

	getImageData( bytes ) {
		// find starting index
		const result = {
			type: '',
			content : null
		};
		const cfbStart = this._indexOfSeq( bytes, this.cfbSig );
		if ( cfbStart >= 0 ) {
			bytes = bytes.slice( cfbStart );
		}

		if ( this._isCFB( bytes ) ) {
			const preview = this._findEmbeddedPreview( bytes );
			if ( !preview ) {
				result.error = 'OLE container found, but no recognizable image/metafile stream was located.';
			} else {
				result.type = preview.type;
				result.content = preview.content;
				result.start = preview.start;
				result.end = preview.end;
			}
		}

		return result;
	}

	_indexOfSeq( b, seq ) {
		outer: for ( let i = 0; i <= b.length - seq.length; i++ ) {
			for ( let j = 0; j < seq.length; j++ ) if ( b[i + j] !== seq[j] ) continue outer;
			return i;
		}
		return -1;
	}

	_isCFB( bytes ) {
		// D0 CF 11 E0 A1 B1 1A E1
		return bytes.length >= 8 &&
				bytes[0] === this.cfbSig[0] && bytes[1] === this.cfbSig[1] && bytes[2] === this.cfbSig[2] && bytes[3] === this.cfbSig[3] &&
				bytes[4] === this.cfbSig[4] && bytes[5] === this.cfbSig[5] && bytes[6] === this.cfbSig[6] && bytes[7] === this.cfbSig[7];
	}

	_findEmbeddedPreview( bytes ) {

		// 2) JPEG
		const jpg = this._findJpeg( bytes ); if ( jpg ) return jpg;

		// 3) GIF
		const gif = this._findGif( bytes ); if ( gif ) return gif;

		// 4) BMP (has total file size in header)
		const bmp = this._findBmp( bytes ); if ( bmp ) return bmp;

		// 5) WMF (Aldus placeable header D7 CD C6 9A) -> use METAHEADER.fileSize (words) for end
		const wmf = this._findWmf( bytes ); if ( wmf ) return wmf;
		
		// 1) PNG
		const png = this._findPng( bytes ); if ( png ) return png;

		// 6) EMF (EMR_HEADER: " EMF" at offset 40; nBytes total at offset 48)
		const emf = this._findEmf( bytes ); if ( emf ) return emf;

		// 7) DIB (BITMAPINFOHEADER) -> estimate total size from header + palette + biSizeImage
		const dib = this._findDib( bytes ); if ( dib ) return dib;

		return null;
	}

	_findPng( b ) {
		const sig = [ 0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A ];
		const s = this._indexOfSeq( b, sig );
		if ( s < 0 ) return null;
		let p = s + 8;
		while ( p + 12 <= b.length ) {
			const len = this._readU32BE( b, p );
			const next = p + 12 + len;
			if ( next > b.length ) break;
			const isIEND = b[p+4]===0x49 && b[p+5]===0x45 && b[p+6]===0x4E && b[p+7]===0x44;
			if ( isIEND ) return { type: 'image/png', start: s, end: next, content: b.slice( s, next ) };
			p = next;
		}
		return null;
	}

	_findJpeg( b ) {
		const s = this._indexOfSeq( b, [ 0xFF,0xD8,0xFF ] );
		if ( s < 0 ) return null;
		for ( let i = s + 2; i < b.length - 1; i++ ) {
			if ( b[i] === 0xFF && b[i+1] === 0xD9 ) {
				const end = i + 2;
				return { type: 'image/jpeg', start: s, end, content: b.slice( s, end ) };
			}
		}
		return null;
	}

	_findGif( b ) {
		let s = this._indexOfSeq( b, [ 0x47,0x49,0x46,0x38,0x39,0x61 ] ); // GIF89a
		if ( s < 0 ) s = this._indexOfSeq( b, [ 0x47,0x49,0x46,0x38,0x37,0x61 ] ); // GIF87a
		if ( s < 0 ) return null;
		for ( let i = s + 6; i < b.length; i++ ) {
			if ( b[i] === 0x3B ) { // trailer ';'
				const end = i + 1;
				return { type: 'image/gif', start: s, end, content: b.slice( s, end ) };
			}
		}
		return null;
	}

	_findBmp( b ) {
		const s = this._indexOfSeq( b, [ 0x42,0x4D ] ); // 'BM'
		if ( s < 0 || s + 6 > b.length ) return null;
		const size = this._readU32LE( b, s + 2 );
		if ( size > 0 && s + size <= b.length ) {
			const end = s + size;
			return { type: 'image/bmp', start: s, end, content: b.slice( s, end ) };
		}
		return null;
	}

	_findWmf( b ) {
		const sig = [ 0xD7,0xCD,0xC6,0x9A ];
		const s = this._indexOfSeq( b, sig );
		if ( s < 0 ) return null;
		const meta = s + 22;
		if ( meta + 8 > b.length ) return null;
		// const type = readU16LE(b, meta); // not needed here
		const headerSizeWords = this._readU16LE( b, meta + 2 );
		if ( headerSizeWords !== 9 && headerSizeWords !== 18 ) {
			// Allow anyway; some writers use 9 words (18 bytes) for header
		}
		const fileSizeWords = this._readU32LE( b, meta + 4 );
		const total = fileSizeWords * 2; // words -> bytes
		if ( total <= 0 ) return null;
		const end = s + total;
		if ( end <= b.length ) {
			return { type: 'wmf', start: s, end, content: b.slice( s, end ) };
		}
		// Fallback: clamp to buffer end if inconsistent
		return { type: 'wmf', start: s, end: b.length, content: b.slice( s ) };
	}

	_findEmf( b ) {
		for ( let i = 0; i + 44 <= b.length; i++ ) {
			if ( b[i+40]===0x20 && b[i+41]===0x45 && b[i+42]===0x4D && b[i+43]===0x46 ) {
				const start = i;
				if ( start < 40 ) continue;
				const hdr = start; // EMR_HEADER starts here
				if ( hdr + 52 > b.length ) continue;
				const nBytes = this._readU32LE( b, hdr + 48 );
				if ( nBytes > 0 && hdr + nBytes <= b.length ) {
					const end = hdr + nBytes;
					return { type: 'emf', start: hdr, end, content: b.slice( hdr, end ) };
				}
			}
		}
		return null;
	}

	_findDib( b ) {
		for ( let i = 0; i + 40 <= b.length; i++ ) {
			const biSize = this._readU32LE( b, i );
			if ( biSize !== 40 ) continue; // only handle BITMAPINFOHEADER
			const biWidth  = this._readS32LE( b, i + 4 );
			const biHeight = this._readS32LE( b, i + 8 );
			const planes   = this._readU16LE( b, i + 12 );
			const bpp      = this._readU16LE( b, i + 14 );
			const comp     = this._readU32LE( b, i + 16 ); // BI_RGB=0, BI_RLE8=1, BI_RLE4=2, BI_BITFIELDS=3
			const biSizeImage = this._readU32LE( b, i + 20 );

			if ( planes !== 1 || biWidth <= 0 || Math.abs( biHeight ) <= 0 ) continue;
			if ( ![ 1,4,8,16,24,32 ].includes( bpp ) ) continue;

			// Palette size
			let paletteBytes = 0;
			if ( bpp <= 8 ) {
				const colorsUsed = this._readU32LE( b, i + 32 );
				const entries = colorsUsed ? colorsUsed : ( 1 << bpp );
				paletteBytes = entries * 4;
			} else if ( comp === 3 /* BI_BITFIELDS */ ) {
				paletteBytes = 12; // 3 masks
			}

			// Pixel data size
			let pixelBytes = biSizeImage;
			if ( pixelBytes === 0 && comp === 0 /* BI_RGB */ ) {
				// Uncompressed: rows padded to 4 bytes
				const bytesPerPixel = bpp / 8;
				const row = Math.ceil( ( biWidth * bytesPerPixel ) / 4 ) * 4;
				pixelBytes = row * Math.abs( biHeight );
			}

			const total = 40 + paletteBytes + ( pixelBytes || 0 );
			const end = i + total;
			if ( total > 40 && end <= b.length ) {
				return { type: 'image/dib', start: i, end, content: b.slice( i, end ) };
			}
		}
		return null;
	}

	_readU16LE( b, o ){ return b[o] | ( b[o+1] << 8 ); }
	_readU32LE( b, o ){ return ( b[o] ) | ( b[o+1] << 8 ) | ( b[o+2] << 16 ) | ( b[o+3] << 24 ); }
	_readS32LE( b, o ){ const u = this._readU32LE( b,o ); return u|0; }
	_readU32BE( b, o ){ return ( b[o]<<24 ) | ( b[o+1]<<16 ) | ( b[o+2]<<8 ) | b[o+3]; }
}