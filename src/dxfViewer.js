import { Group, Vector3 } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

import { TextEntity } from './entities/textEntity.js';
import { DimensionEntity } from './entities/dimensionEntity.js';
import { LineEntity } from './entities/lineEntity.js';
import { InsertEntity } from './entities/insertEntity.js';
import { CircleEntity } from './entities/circleEntity';
import { SplineEntity } from './entities/splineEntity';
import { SolidEntity } from './entities/solidEntity';
import { HatchEntity } from './entities/hatchEntity';

import Helper from 'dxf/src/Helper';
import { Properties } from './entities/baseEntity/properties';
import { LayerHelper } from './entities/baseEntity/layerHelper.js';
import { ColorHelper } from './entities/baseEntity/colorHelper.js';
import { EventEmitter } from './tools/eventEmitter.js';

/**
 * @class DXFViewer
 * @classdesc Main class to create the dxf viewer object. 
 * This object will parse the dxf using skymakerolof's [dxf library](https://github.com/skymakerolof/dxf) and create a three.js object. 
 * [DXF FORMAT DOCUMENTATION](https://documentation.help/AutoCAD-DXF/WS1a9193826455f5ff18cb41610ec0a2e719-79f8.htm)
 * triggers 'error' and 'log' events
 */
export class DXFViewer extends EventEmitter{
	
	constructor() {
		super();

		this._cache = new Map();
		this.useCache = false;

		this.colorHelper = new ColorHelper();
		this.LayerHelper = new LayerHelper();
	}    

	/**
	 * Returns a Three.js object with the dxf data. Calls to getFromPath method internally
	 * @param file {File} dxf file to load.
	 * @param fontPath {string} path to the font file.
     * @return {THREE.Group} object with the dxf data
	*/
	async getFromFile( file, fontPath ) {
		let path = URL.createObjectURL( file );

		return await this.getFromPath( path, fontPath );
	}

	/**
	 * Returns a Three.js object with the dxf data.
	 * @param path path to a dxf file to load. Type: String
	 * @param fontPath path to the font file. Type: string	 
     * @return THREE.Group object with the dxf data
	*/
	async getFromPath( path, fontPath ) {

		await this._loadFont( fontPath );

		if( !this._font ) return null;

		let cached = this._fromCache( path );
			
		//from cache
		if( cached ) {
			return this._drawDXF( cached.data ? cached.data : cached );
		}
			
		//load file
		await this.trigger( 'progress', 'Fetching file ...' );
		let rawdata = await fetch( path );
		if( rawdata.status !== 200 ) return null;            
		let file = await rawdata.text();

		//parse data
		await this.trigger( 'progress', 'Parsing file ...' );
		let parser = new Helper( file ); 
		let data = parser.parse();

		await this.trigger( 'progress', 'Drawing file ...' );
		
		//save it
		this.lastDXF = data;

		//clear memory
		parser._parsed = null;
		parser = null;
		rawdata = null;
		file = null;
		
		//parse layers
		this.lastDXF.tables.layers = this.LayerHelper.parse( this.lastDXF.tables.layers );

		//export layers
		this.layers = this.lastDXF.tables.layers;

		//export global unit
		this.unit = this.lastDXF.header ? this.lastDXF.header.insUnits : 0;

		//return draw
		const draw = await this._drawDXF( this.lastDXF );
		return draw;
	}

	async _drawDXF( data ) {
		let group = new Group();
		group.name = 'DXFViewer';
		
		//Change to false if we intent to modify the geometries. Otherwise the cached geometry will be modified too.
		if( !this.useCache ) Properties.cache = false;

		//initialize
		let lines = new LineEntity( data );
		lines.subscribe( 'log', async message => await this._log( 'LineEntity', message ) );
		let circles = new CircleEntity( data );
		circles.subscribe( 'log', async message => await this._log( 'CircleEntity', message ) );
		let splines = new SplineEntity( data );
		splines.subscribe( 'log', async message => await this._log( 'SplineEntity', message ) );
		let solids = new SolidEntity( data );
		solids.subscribe( 'log', async message => await this._log( 'SolidEntity', message ) );
		let dimensions = new DimensionEntity( data, this._font );
		dimensions.subscribe( 'log', async message => await this._log( 'DimensionEntity', message ) );
		let texts = new TextEntity( data, this._font );
		texts.subscribe( 'log', async message => await this._log( 'TextEntity', message ) );		
		let inserts = new InsertEntity( data, this._font );
		inserts.subscribe( 'log', async message => await this._log( 'InsertEntity', message ) );
		let hatchs = new HatchEntity( data, this._font );
		hatchs.subscribe( 'log', async message => await this._log( 'HatchEntity', message ) );

		//add callbacks
		Properties.onBeforeTextDraw = this.onBeforeTextDraw;

		//draw
		lines = lines.draw( data );
		circles = circles.draw( data );
		splines = splines.draw( data );
		solids = solids.draw( data );
		dimensions = dimensions.draw( data );
		texts = texts.draw( data );
		inserts = inserts.draw( data, data );
		hatchs = hatchs.draw( data, refs => {
			const refEntities = [];
			const add = array => {
				array.forEach( e => {
					if( refs.includes( e.userData.entity.handle ) ) refEntities.push( e );
				} );
			};
			if( lines ) add( lines.children );
			if( circles ) add( circles.children );
			if( splines ) add( splines.children );
			if( solids ) add( solids.children );
			if( dimensions ) add( dimensions.children );
			if( texts ) add( texts.children );
			if( inserts ) add( inserts.children );
			return refEntities;
		} );

		//add to group
		if( lines ) group.add( lines );
		if( circles ) group.add( circles );
		if( splines ) group.add( splines );
		if( solids ) group.add( solids );
		if( dimensions ) group.add( dimensions );
		if( texts ) group.add( texts );
		if( inserts ) group.add( inserts );
		if( hatchs ) group.add( hatchs );

		this._rotateByView( group, data );

		return group;
	}
    
	_toCache( path, data ) {
		this._cache.set( this._replaceEspecialChars( path ),  new WeakRef( data ) );
	}

	_fromCache( path ) {
		const key = this._replaceEspecialChars( path );
		if ( this._cache.has( key ) ) {
			const dereferencedValue = this._cache.get( key ).deref();
			if ( dereferencedValue !== undefined ) {
				return dereferencedValue;
			}
		}
		
		return null;
	}

	_replaceEspecialChars( str ) {
		return str.replaceAll( '/','' ).
			replaceAll( '.','' ).
			replaceAll( '_','' ).
			replaceAll( '-','' );
	}

	async _loadFont( fontPath ) {
		if( this._font ) return;
		try{
			this._font = await new Promise( ( resolve, reject ) => {
				const loader = new FontLoader();
				loader.load( fontPath, resolve, null, reject );
			} );
		}
		catch( e ) {
			await this.trigger( 'error', e );
			this._font = null;
		}
	}

	_rotateByView( group, data ) {
		let model = data.objects && data.objects.layouts ? data.objects.layouts.find( o => o.name.toLowerCase() === 'model' ) : null;
		if( !model ) return;
		let keys = Object.keys( data.tables.vports );
		for ( let i = 0; i < keys.length; i++ ) {
			let vport = data.tables.vports[ keys[i] ];
			if( vport.handle === model.lastActiveViewport && vport.angle !== 0 ) {
				group.rotateOnAxis( new Vector3( 0, 0, 1 ), vport.angle * Math.PI / 180 );
				return;
			}
		}
	}

	async _log( sender, message ) {
		await this.trigger( 'log', `${sender}: ${message}` );
	}

	get DefaultTextHeight() {
		return TextEntity.TextHeight;
	}
	set DefaultTextHeight( value ) {
		TextEntity.TextHeight = value;
	}

	get DefaultTextScale() {
		return TextEntity.TextScale;
	}
	set DefaultTextScale( value ) {
		TextEntity.TextScale = value;
	}
}