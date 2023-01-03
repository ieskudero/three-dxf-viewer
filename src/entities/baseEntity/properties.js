/**
 * @class Properties
 * @classdesc Properties class that all entities shares
 */
export class Properties {
	/** @property cache {boolean} Checks if module will cache generated entities or not */
	static cache =  true;
	/** @property showFrozen {boolean} Checks if module will show frozen dxf entities */
	static showFrozen =  false;
	/** @property showLocked {boolean} Checks if module will show locked dxf entities */
	static showLocked =  true;
	/** @property paperSpace {int} also called  sheet or layout. 0 is always model. */
	static paperSpace =  0;      
	/** @property decimal {int} readed decimals in a number */
	static decimals =  6;
	/** @property onBeforeTextDraw {method} An event to change text values before rendering it. Useful to change dimensions or text */
	static onBeforeTextDraw = null;
}