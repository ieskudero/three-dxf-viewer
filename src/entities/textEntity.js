import { BaseEntity } from "./baseEntity/baseEntity";
import { Mesh, Group,
         ShapeGeometry, 
         Quaternion } from 'three';
import { MTextFormatParser } from '../text/MTextFormatParser.js';
import { Properties } from "./baseEntity/properties";

/**
 * @class textEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF text, mtext && attrib entity class.
 */
export class TextEntity extends BaseEntity {
	
	constructor( data, font ) { 
		super( data );
		this._font = font;
        this._textParser = new MTextFormatParser();
	}

    /**
	 * It filters all the text, mtext and attrib entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {

        //get all texts
        let entities = data.entities.filter( entity => entity.type === 'MTEXT' || entity.type === 'TEXT' || entity.type === 'ATTRIB' );
        if( entities.length === 0 ) return null;

        let group = new Group();

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i];

            if( this._hideEntity( entity ) ) continue;
            
            let cached = this._getCached( entity );
            let geometry = null;
            let material = null;
            if( cached ) { 
                geometry = cached.geometry;
                material = cached.material;
            } else {
                let _drawData = this.drawText( entity );
                geometry = _drawData.geometry;
                material = _drawData.material;
                
                if( !Properties.onBeforeTextDraw ) this._setCache( entity, _drawData );
            }

            //create mesh
            let mesh = new Mesh( geometry, material );
            mesh.userData = entity;

            //add to group
            group.add( mesh );
        }

        return group;
    }

    /**
	 * Draws text, mtext and attrib entities.
	 * @param entity {entity} dxf parsed text, mtext or attrib entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
    drawText( entity ) {

        if(entity.type === 'ATTRIB' ) {
            if( Object.keys(entity.mtext).length !== 0 ) 
                return this.drawText( entity.mtext );
            else 
                return this.drawText( entity.text );
        }

        //get string
        let geometry = this._getTextGeometry( entity );

        this._scaleText( geometry, entity );
        
        let posAndRot = this._getPosAndRotation( entity );

        if( posAndRot.rotation )  geometry.applyQuaternion( posAndRot.rotation );
        geometry.translate( posAndRot.pos.x , posAndRot.pos.y, posAndRot.pos.z );
		
        this._translateCenter( geometry, entity, posAndRot.pos );
            
        //get material
        let material = this._getMaterial( entity, 'shape' );

        return { geometry: geometry, material: material };
    }

    _getTextGeometry( entity ) {
        let strings = this._getTextStrings( entity );
        
        //TODO: if any string's width exceeds entity.refRectangleWidth we must cut it
        let text = strings.join('');

        if( Properties.onBeforeTextDraw ) { 
            let json = { text: text }
            Properties.onBeforeTextDraw( json );
            text = json.text;
        }

        //get size
        let textSize = this._getTextHeight( entity );

        //generate shape
        let shapes = this._font.generateShapes( text, textSize );
        return new ShapeGeometry( shapes );
    }

    _getTextHeight( entity ) {
        let textSize =  12;
        if ( typeof entity.nominalTextHeight !== 'undefined' )
            textSize = entity.nominalTextHeight; 
        else if ( typeof entity.textHeight !== 'undefined' )
            textSize = entity.textHeight;

        return textSize;
    }

    _scaleText( geometry, entity ) {

        geometry.computeBoundingBox();
        let width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
        let height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        
        let scaleX = typeof entity.horizontalWidth !== 'undefined' ? entity.horizontalWidth / width : 1;
        let scaleY = typeof entity.verticalHeight !== 'undefined' ? entity.verticalHeight / height : 1;

        geometry.scale( scaleX, scaleY, 1 );
    }

    _getTextStrings( entity ) {
        
        let getContent = ( entities ) => {
            let strs = [];
            for (let i = 0; i < entities.length; i++) {

                const content = entities[i];
                if(content.type === MTextFormatParser.EntityType.PARAGRAPH || content.type === MTextFormatParser.EntityType.PARAGRAPH_ALIGNMENT )
                    strs.push( '\n' );
                if( typeof content.content === 'string' )
                    strs.push( content.content )
                else if( content.content instanceof Array ) {
                    let temp = getContent( content.content );
                    if( temp ) strs.push( temp );
                }
            }

            return strs;            
        };

        let parser = new MTextFormatParser().Parse( entity.string );
        let text = getContent( parser.entities );

        return text;
    }

    _getPosAndRotation( entity ) {
        
        let result = { pos: { x: 0, y: 0, z: 0 }, rotation: null };

        let x = entity.x;
        let y = entity.y;
        let z = entity.z;
        let rotation = entity.rotation;
        let xAxisX = entity.xAxisX;
        let xAxisY = entity.xAxisY;
        let xAxisZ = entity.xAxisZ;
        let drawingDirection = entity.drawingDirection;
        
        let xt = x.toFixed( Properties.decimals );
        let yt = y.toFixed( Properties.decimals );
        let zt = z.toFixed( Properties.decimals );
        
        let zeros = '0'.repeat( Properties.decimals );
        let zero = '0.' + zeros;
        let one = '1.' + zeros;

        let axisOnXYZ = ( ( xt === one && yt === zero && zt === zero ) || 
                  ( xt === zero && yt === one && zt === zero ) || 
                  ( xt === zero && yt === zero && zt === one ) );

        result.pos.x = axisOnXYZ ? xAxisX : x;
        result.pos.y = axisOnXYZ ? xAxisY : y;
        result.pos.z = axisOnXYZ ? xAxisZ : z;

        if( rotation ) 
            result.rotation = new Quaternion().setFromAxisAngle( this._zAxis, ( rotation * Math.PI ) / 180 );
        else if ( drawingDirection === 3 || ( ( axisOnXYZ && y === 1 ) || ( !axisOnXYZ && xAxisY === 1 ) ) )
            result.rotation = new Quaternion().setFromAxisAngle( this._zAxis, Math.PI / 2 );

        return result;
    }

    _translateCenter( geometry, entity, center ) {

        let attachmentPoint = entity.attachmentPoint;
        
        if(!attachmentPoint) return;

        geometry.computeBoundingBox();
        let width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
        let height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
        let depth = geometry.boundingBox.max.z - geometry.boundingBox.min.z;

        let currentCenter = { 
            x: geometry.boundingBox.min.x + width / 2,
            y: geometry.boundingBox.min.y + height / 2
        };

        switch (attachmentPoint) {
            case 1:
                // Top Left
                geometry.translate( center.x - geometry.boundingBox.min.x , center.y - geometry.boundingBox.max.y , -0.5 * depth );
                break;
            case 2:
                // Top Center
                geometry.translate( center.x - currentCenter.x, center.y - geometry.boundingBox.max.y , -0.5 * depth );
                break;
            case 3:
                // Top Right
                geometry.translate( center.x - geometry.boundingBox.max.x , center.y - geometry.boundingBox.max.y , -0.5 * depth );
                break;
            case 4:
                // Middle Left
                geometry.translate( center.x - geometry.boundingBox.min.x , center.y - currentCenter.y , -0.5 * depth );
                break;
            case 5:
                // Middle Center
                geometry.translate( center.x - currentCenter.x , center.y - currentCenter.y , -0.5 * depth );
                break;
            case 6:
                // Middle Right
                geometry.translate( center.x - geometry.boundingBox.max.x, center.y - currentCenter.y , -0.5 * depth );
                break;
            case 7:
                // Bottom Left
                geometry.translate( center.x - geometry.boundingBox.min.x , center.y - geometry.boundingBox.min.y , -0.5 * depth );
                break;
            case 8:
                // Bottom Center
                geometry.translate( center.x - currentCenter.x , geometry.boundingBox.min.y, -0.5 * depth );
                break;
            case 9:
                // Bottom Right
                geometry.translate( center.x - geometry.boundingBox.max.x, geometry.boundingBox.min.y , -0.5 * depth );
                break;
        };
    }

    _replaceSpecialChars( str ) {
        return str.replaceAll('\\P', '\n').
                   replaceAll('\\X', '\n').
                   replaceAll('%%d', '\u00B0').
                   replaceAll('%%p', '\u00B1').
                   replaceAll('%%c', '\u2205').
                   replaceAll('%%%', '%');
    }
}