import { DoubleSide, LineBasicMaterial, LineDashedMaterial, MeshBasicMaterial } from "three";
import { BaseCache } from "./baseCache";

var _materialCache = {};

/**
 * @class BaseColor
 * @see {@link BaseCache.md}
 * @classdesc Base class for all the entities. It stores the color methods & information.
 */
export class BaseColor extends BaseCache {

	constructor() {
		super();
	}

    /**
	 * Returns the entity's material. It will create a new material if it doesn't exist in the cache.
	 * @param entity {Entity} DXFViewer Entity.
     * @param type {string} A flag to indicate the type of material to be created. It can be 'shape', 'line' or 'dashed'.
     * @return {THREE.Material} Material
	*/
	_getMaterial( entity, type ) {
        let color = this._getColorHex( entity );
		let key = entity.lineTypeName + type + color;
		if( _materialCache[key] ) return _materialCache[key];
		
		let mat = type === 'shape' ? new MeshBasicMaterial( { side: DoubleSide }) : 
                 ( type === 'line' ? new LineBasicMaterial() : this._createDashedMaterial( entity ) );

        mat.color.setHex( color );
        mat.color.convertSRGBToLinear();
        mat.name = key;
		_materialCache[key] = mat;
		
		return mat;
	}

	_createDashedMaterial( entity ) {
        let gapSize = 4;
        let dashSize = 4;

        //TODO: create a better way to handle this. Ideal would be to create a shader that mimics the pattern of the line type
        let type = entity.lineTypeName && this.data.tables.ltypes.hasOwnProperty( entity.lineTypeName ) ? this.data.tables.ltypes[ entity.lineTypeName ] : null;
        dashSize = type.pattern && type.pattern.length > 0 ? Math.max(...type.pattern.map(e => e.length) ) : 4;
        gapSize = type.pattern && type.pattern.length > 0 ? type.pattern.map(e => e.length === -1).length : 4;

        dashSize = dashSize === 0 ? 4 : dashSize;

        return new LineDashedMaterial( { gapSize: gapSize, dashSize: dashSize } );
    }

	_getColorHex( entity ) {
        let colorNumber = entity.fillColor ? entity.fillColor : entity.colorNumber;
        if( !colorNumber || colorNumber === 0) {
            let layerObj = this.data.tables.layers.hasOwnProperty( entity.layer ) ? this.data.tables.layers[ entity.layer ] : null;
            if( layerObj ) colorNumber = layerObj.colorNumber;
        }
        switch ( colorNumber ) {
            case 0	: return 0x000000;            
            case 1	: return 0xFF0000;
            case 2	: return 0xFFFF00;
            case 3	: return 0x00FF00;
            case 4	: return 0x00FFFF;
            case 5	: return 0x0000FF;
            case 6	: return 0xFF00FF;
            case 7	: return 0xFFFFFF;
            case 8	: return 0x414141;
            case 9	: return 0x808080;
            case 10	: return 0xFF0000;
            case 11	: return 0xFFAAAA;
            case 12	: return 0xBD0000;
            case 13	: return 0xBD7E7E;
            case 14	: return 0x810000;
            case 15	: return 0x815656;
            case 16	: return 0x680000;
            case 17	: return 0x684545;
            case 18	: return 0x4F0000;
            case 19	: return 0x4F3535;
            case 20	: return 0xFF3F00;
            case 21	: return 0xFFBFAA;
            case 22	: return 0xBD2E00;
            case 23	: return 0xBD8D7E;
            case 24	: return 0x811F00;
            case 25	: return 0x816056;
            case 26	: return 0x681900;
            case 27	: return 0x684E45;
            case 28	: return 0x4F1300;
            case 29	: return 0x4F3B35;
            case 30	: return 0xFF7F00;
            case 31	: return 0xFFD4AA;
            case 32	: return 0xBD5E00;
            case 33	: return 0xBD9D7E;
            case 34	: return 0x814000;
            case 35	: return 0x816B56;
            case 36	: return 0x683400;
            case 37	: return 0x685645;
            case 38	: return 0x4F2700;
            case 39	: return 0x4F4235;
            case 40	: return 0xFFBF00;
            case 41	: return 0xFFEAAA;
            case 42	: return 0xBD8D00;
            case 43	: return 0xBDAD7E;
            case 44	: return 0x816000;
            case 45	: return 0x817656;
            case 46	: return 0x684E00;
            case 47	: return 0x685F45;
            case 48	: return 0x4F3B00;
            case 49	: return 0x4F4935;
            case 50	: return 0xFFFF00;
            case 51	: return 0xFFFFAA;
            case 52	: return 0xBDBD00;
            case 53	: return 0xBDBD7E;
            case 54	: return 0x818100;
            case 55	: return 0x818156;
            case 56	: return 0x686800;
            case 57	: return 0x686845;
            case 58	: return 0x4F4F00;
            case 59	: return 0x4F4F35;
            case 60	: return 0xBFFF00;
            case 61	: return 0xEAFFAA;
            case 62	: return 0x8DBD00;
            case 63	: return 0xADBD7E;
            case 64	: return 0x608100;
            case 65	: return 0x768156;
            case 66	: return 0x4E6800;
            case 67	: return 0x5F6845;
            case 68	: return 0x3B4F00;
            case 69	: return 0x494F35;
            case 70	: return 0x7FFF00;
            case 71	: return 0xD4FFAA;
            case 72	: return 0x5EBD00;
            case 73	: return 0x9DBD7E;
            case 74	: return 0x408100;
            case 75	: return 0x6B8156;
            case 76	: return 0x346800;
            case 77	: return 0x566845;
            case 78	: return 0x274F00;
            case 79	: return 0x424F35;
            case 80	: return 0x3FFF00;
            case 81	: return 0xBFFFAA;
            case 82	: return 0x2EBD00;
            case 83	: return 0x8DBD7E;
            case 84	: return 0x1F8100;
            case 85	: return 0x608156;
            case 86	: return 0x196800;
            case 87	: return 0x4E6845;
            case 88	: return 0x134F00;
            case 89	: return 0x3B4F35;
            case 90	: return 0x00FF00;
            case 91	: return 0xAAFFAA;
            case 92	: return 0x00BD00;
            case 93	: return 0x7EBD7E;
            case 94	: return 0x008100;
            case 95	: return 0x568156;
            case 96	: return 0x006800;
            case 97	: return 0x456845;
            case 98	: return 0x004F00;
            case 99	: return 0x354F35;
            case 100: return 0x00FF3F;
            case 101: return 0xAAFFBF;
            case 102: return 0x00BD2E;
            case 103: return 0x7EBD8D;
            case 104: return 0x00811F;
            case 105: return 0x568160;
            case 106: return 0x006819;
            case 107: return 0x45684E;
            case 108: return 0x004F13;
            case 109: return 0x354F3B;
            case 110: return 0x00FF7F;
            case 111: return 0xAAFFD4;
            case 112: return 0x00BD5E;
            case 113: return 0x7EBD9D;
            case 114: return 0x008140;
            case 115: return 0x56816B;
            case 116: return 0x006834;
            case 117: return 0x456856;
            case 118: return 0x004F27;
            case 119: return 0x354F42;
            case 120: return 0x00FFBF;
            case 121: return 0xAAFFEA;
            case 122: return 0x00BD8D;
            case 123: return 0x7EBDAD;
            case 124: return 0x008160;
            case 125: return 0x568176;
            case 126: return 0x00684E;
            case 127: return 0x45685F;
            case 128: return 0x004F3B;
            case 129: return 0x354F49;
            case 130: return 0x00FFFF;
            case 131: return 0xAAFFFF;
            case 132: return 0x00BDBD;
            case 133: return 0x7EBDBD;
            case 134: return 0x008181;
            case 135: return 0x568181;
            case 136: return 0x006868;
            case 137: return 0x456868;
            case 138: return 0x004F4F;
            case 139: return 0x354F4F;
            case 140: return 0x00BFFF;
            case 141: return 0xAAEAFF;
            case 142: return 0x008DBD;
            case 143: return 0x7EADBD;
            case 144: return 0x006081;
            case 145: return 0x567681;
            case 146: return 0x004E68;
            case 147: return 0x455F68;
            case 148: return 0x003B4F;
            case 149: return 0x35494F;
            case 150: return 0x007FFF;
            case 151: return 0xAAD4FF;
            case 152: return 0x005EBD;
            case 153: return 0x7E9DBD;
            case 154: return 0x004081;
            case 155: return 0x566B81;
            case 156: return 0x003468;
            case 157: return 0x455668;
            case 158: return 0x00274F;
            case 159: return 0x35424F;
            case 160: return 0x003FFF;
            case 161: return 0xAABFFF;
            case 162: return 0x002EBD;
            case 163: return 0x7E8DBD;
            case 164: return 0x001F81;
            case 165: return 0x566081;
            case 166: return 0x001968;
            case 167: return 0x454E68;
            case 168: return 0x00134F;
            case 169: return 0x353B4F;
            case 170: return 0x0000FF;
            case 171: return 0xAAAAFF;
            case 172: return 0x0000BD;
            case 173: return 0x7E7EBD;
            case 174: return 0x000081;
            case 175: return 0x565681;
            case 176: return 0x000068;
            case 177: return 0x454568;
            case 178: return 0x00004F;
            case 179: return 0x35354F;
            case 180: return 0x3F00FF;
            case 181: return 0xBFAAFF;
            case 182: return 0x2E00BD;
            case 183: return 0x8D7EBD;
            case 184: return 0x1F0081;
            case 185: return 0x605681;
            case 186: return 0x190068;
            case 187: return 0x4E4568;
            case 188: return 0x13004F;
            case 189: return 0x3B354F;
            case 190: return 0x7F00FF;
            case 191: return 0xD4AAFF;
            case 192: return 0x5E00BD;
            case 193: return 0x9D7EBD;
            case 194: return 0x400081;
            case 195: return 0x6B5681;
            case 196: return 0x340068;
            case 197: return 0x564568;
            case 198: return 0x27004F;
            case 199: return 0x42354F;
            case 200: return 0xBF00FF;
            case 201: return 0xEAAAFF;
            case 202: return 0x8D00BD;
            case 203: return 0xAD7EBD;
            case 204: return 0x600081;
            case 205: return 0x765681;
            case 206: return 0x4E0068;
            case 207: return 0x5F4568;
            case 208: return 0x3B004F;
            case 209: return 0x49354F;
            case 210: return 0xFF00FF;
            case 211: return 0xFFAAFF;
            case 212: return 0xBD00BD;
            case 213: return 0xBD7EBD;
            case 214: return 0x810081;
            case 215: return 0x815681;
            case 216: return 0x680068;
            case 217: return 0x684568;
            case 218: return 0x4F004F;
            case 219: return 0x4F354F;
            case 220: return 0xFF00BF;
            case 221: return 0xFFAAEA;
            case 222: return 0xBD008D;
            case 223: return 0xBD7EAD;
            case 224: return 0x810060;
            case 225: return 0x815676;
            case 226: return 0x68004E;
            case 227: return 0x68455F;
            case 228: return 0x4F003B;
            case 229: return 0x4F3549;
            case 230: return 0xFF007F;
            case 231: return 0xFFAAD4;
            case 232: return 0xBD005E;
            case 233: return 0xBD7E9D;
            case 234: return 0x810040;
            case 235: return 0x81566B;
            case 236: return 0x680034;
            case 237: return 0x684556;
            case 238: return 0x4F0027;
            case 239: return 0x4F3542;
            case 240: return 0xFF003F;
            case 241: return 0xFFAABF;
            case 242: return 0xBD002E;
            case 243: return 0xBD7E8D;
            case 244: return 0x81001F;
            case 245: return 0x815660;
            case 246: return 0x680019;
            case 247: return 0x68454E;
            case 248: return 0x4F0013;
            case 249: return 0x4F353B;
            case 250: return 0x333333;
            case 251: return 0x505050;
            case 252: return 0x696969;
            case 253: return 0x828282;
            case 254: return 0xBEBEBE;
            case 255: return 0xFFFFFF;
        }

        //default
        return 0xffffff;
    }

}