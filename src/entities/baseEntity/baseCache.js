import { Properties } from './properties.js';
import { EventEmitter } from '../../tools/eventEmitter.js';

var __cache = new Map();
var __index = 1;

/**
 * @class BaseCache
 * @classdesc Base class for all the entities. It stores the cache for the entities.
 */
export class BaseCache extends EventEmitter {

	constructor() {
		super();
		this.cache = true;
	}

	/**
	 * Returns the cached object if exist. Otherwise null
	 * @param entity {Entity} DXFViewer Entity.
     * @return {Object} object  usually composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	_getCached( entity ) {
		if( !entity._cache || !Properties.cache ) return null;
		const key = entity._cache;
		if ( this._cache.has( key ) ) {
			const dereferencedValue = this._cache.get( key ).deref();
			if ( dereferencedValue !== undefined ) {
				return dereferencedValue;
			}
		}
		
		return null;		
	}

	/**
	 * Stores the entity in the cache. Adds _cache property to the entity to store the cache key 
	 * @param entity {Entity} DXFViewer Entity.
	 * @param model {Object} object to be stored. usually an object composed as {geometry: THREE.Geometry, material: THREE.Material}.
	*/
	_setCache( entity, model ) {
		const key = 'e' + __index;
		entity._cache = key;
		__index ++;
		__cache.set( key, model );
	}	

}