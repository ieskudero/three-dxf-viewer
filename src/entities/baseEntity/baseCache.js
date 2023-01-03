import { Properties } from './properties.js';

var __cache = {};
var __index = 1;

/**
 * @class BaseCache
 * @classdesc Base class for all the entities. It stores the cache for the entities.
 */
export class BaseCache {

	constructor() {
		this.cache = true;
	}

    /**
	 * Returns the cached object if exist. Otherwise null
	 * @param entity {Entity} DXFViewer Entity.
     * @return {Object} object  usually composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
    _getCached( entity ) {
        return entity._cache && Properties.cache ? __cache[entity._cache] : null;
    }

    /**
	 * Stores the entity in the cache. Adds _cache property to the entity to store the cache key 
	 * @param entity {Entity} DXFViewer Entity.
	 * @param model {Object} object to be stored. usually an object composed as {geometry: THREE.Geometry, material: THREE.Material}.
	*/
    _setCache( entity, model ) {
        entity._cache = 'e' + __index;
        __index ++;
        __cache[entity._cache] = model;
    }	

}