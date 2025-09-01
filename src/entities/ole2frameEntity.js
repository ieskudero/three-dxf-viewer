import { BaseEntity } from './baseEntity/baseEntity';
import { 
	Group, 
	Mesh,
	PlaneGeometry, 
	MeshStandardMaterial, 
	DoubleSide, 
	Texture } from 'three';
import { Ole2FrameWMFRenderer } from './ole2FrameWMFRenderer';
import { Ole2FrameCFBHelpers } from './ole2FrameCFBHelpers';


/**
 * @class Ole2FrameEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF OLE2FRAME entity class.
 */
export class Ole2FrameEntity extends BaseEntity {
	constructor( data ) { 
		super( data );
		this._Ole2FrameCFBHelpers = new Ole2FrameCFBHelpers();
		this._wmfRenderer = new Ole2FrameWMFRenderer();
	}

	/**
	 * It filters all the line, polyline and lwpolylin entities and draw them.
	 * @param data {DXFData} dxf parsed data.
	 * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	async draw( data ) {
		
		let group = new Group();
		group.name = 'OLE2FRAMES';
		
		//get all lines
		let entities = data.entities.filter( entity => entity.type === 'OLE2FRAME' );
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
				let _drawData = await this.drawOle2Frame( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
				material.side = DoubleSide;
				
				this._setCache( entity, _drawData );
			}

			//create mesh
			let mesh = new Mesh( geometry, material );
			mesh.userData = { entity: entity };

			//add to group
			group.add( mesh );
		}

		return group;
	}

	/**
	 * Draws an Ole2Frame entity.
	 * @param entity {entity} dxf parsed Ole2Frame entity.
	 * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	async drawOle2Frame( entity ) {
		
		//make a plane that will hold the image
		const width = entity.lowerRightX - entity.upperLeftX;
		const height = entity.upperLeftY - entity.lowerRightY;
		let geometry = new PlaneGeometry( width, height );

		//the image is pivoted at center, and we have the upperLeftCorner of it
		geometry.translate( entity.upperLeftX + width / 2, entity.upperLeftY - height / 2, 0 );

		// the image binary data is in entity.data. We need to convert it to a texture
		let material = new MeshStandardMaterial();
		material.map = await this._createTextureFromImageData( entity );
		
		material.color.setHex( 0xFFFFFF );
		material.color.convertSRGBToLinear();

		return { geometry: geometry, material: material };
	}

	async _createTextureFromImageData( entity ) {
		
		//parse to Uint8Array
		let bytes = this.hexToUint8Array( entity.data );

		//make sure we comply with length
		if ( Number.isFinite( entity.length ) && entity.length > 0 && bytes.length > entity.length ) {
			bytes = bytes.slice( 0, entity.length );
		}

		// OLE Compound File Binary (CFB), extract the image/metafile stream first
		const imgData = this._Ole2FrameCFBHelpers.getImageData( bytes );

		// render wmf image
		if ( /wmf/.test( imgData.type ) ) {
			return await this._wmfRenderer.render( imgData.content );
		}

		if ( /emf/.test( imgData.type ) ) {
			this.trigger( 'log', `Unsupported image type (mime=${imgData.type}).` );
			return null;
		}
		
		//if we couldn't get the image, return empty texture
		if ( !imgData.type.startsWith( 'image/' ) ) {
			this.trigger( 'log', `Unsupported image type (mime=${imgData.type}).` );
			return null;
		}

		//TODO: render if image
		const blob = new Blob( [ imgData.content ], { type: imgData.type } );
		const url = URL.createObjectURL( blob );

		// Use Image + THREE.Texture (you could also use THREE.TextureLoader on the same URL)
		const texture = new Texture();
		await new Promise( ( resolve, reject ) => {
			const img = new Image();
			img.onload = () => {
				texture.image = img;
				texture.needsUpdate = true;
				URL.revokeObjectURL( url );
				resolve();
			};
			img.onerror = () => {
				URL.revokeObjectURL( url );
				reject( new Error( `Failed to decode image (${imgData.type}) from OLE payload` ) );
			};
			img.src = url;
		} );

		return texture;
	}

	hexToUint8Array( hex ) {
		const clean = ( hex || '' ).replace( /\s+/g, '' );
		if ( clean.length % 2 ) throw new Error( 'Hex string has odd length.' );
		const out = new Uint8Array( clean.length >>> 1 );
		for ( let i = 0, j = 0; i < clean.length; i += 2, j++ ) out[j] = parseInt( clean.substr( i, 2 ), 16 );
		return out;
	}
}