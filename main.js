/** 
 * @module three-dxf-viewer 
 * @description DXF viewer made using [dxf parser](https://github.com/skymakerolof/dxf) and [threejs](https://github.com/mrdoob/three.js/). 
 * It generates a threejs object that can be used in any scene. It also has some utility classes such as a merger and a snap helper.
*/

import { DXFViewer } from './src/dxfViewer';
import { Merger } from './src/utils/merger';
import { SnapsHelper } from './src/utils/snapsHelper';

/**
 * @property {class} DXFViewer Main viewer object
 * @property {class} Merger utility
 * @property {class} SnapsHelper utility
 */
export {
	DXFViewer,
	Merger,
	SnapsHelper
};