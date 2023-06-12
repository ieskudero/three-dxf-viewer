import { BaseEntity } from './baseEntity/baseEntity';
import { Group,
	ArcCurve,
	BufferGeometry,
	Line,
	EllipseCurve,
	BufferAttribute } from 'three';

/**
 * @class CircleEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF circle, arc and ellipse entity class.
 */
export class CircleEntity extends BaseEntity {
	constructor( data ) { super( data ); }

	/**
	 * It filters all the circle, arc and ellipse entities and draw them.
	 * @param data {DXFData} dxf parsed data.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	draw( data ) {
        
		//get all circles
		let entities = data.entities.filter( entity => entity.type === 'ARC' || 
                                             entity.type === 'CIRCLE' ||
                                             entity.type === 'ELLIPSE' );
		if( entities.length === 0 ) return null;

		let group = new Group();
		group.name = 'CIRCLES';
		
		for( let i = 0; i < entities.length; i++ ) {
			let entity = entities[i];

			if( this._hideEntity( entity ) ) continue;
            
			let cached = this._getCached( entity );

			let geometry = null;
			let material = null;
			if( cached ) { 
				geometry = cached.geometry;
				material = cached.material;
			} else {
				let _drawData = entity.type === 'ELLIPSE' ? this.drawEllipse( entity ) :this.drawCircle( entity );
				geometry = _drawData.geometry;
				material = _drawData.material;
                
				this._setCache( entity, _drawData );
			}

			//create mesh
			let mesh = new Line( geometry, material );
			if( material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( mesh );
			mesh.userData = { entity: entity };

			//add to group
			group.add( mesh );
		}

		return group;
	}

	/**
	 * Draws a circle or arc entity.
	 * @param entity {entity} dxf parsed circle or arc entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawCircle( entity ) {
        
		let lineType = 'line';
        
		if ( entity.lineTypeName ) {
			let ltype = this.data.tables.ltypes[entity.lineTypeName];
			if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
		}
        
		let material = this._colorHelper.getMaterial( entity, lineType, this.data.tables );
				
		let startAngle, endAngle;
		if ( entity.type === 'CIRCLE' ) {
			startAngle = entity.startAngle || 0;
			endAngle = startAngle + 2 * Math.PI;
		} else {    //ARC
			startAngle = entity.startAngle;
			endAngle = entity.endAngle;
			if( entity.extrusionZ < 0 ) { 
				let newAngles = this._rotateXY( entity.startAngle, entity.endAngle );
				startAngle = newAngles[1];
				endAngle = newAngles[0];
			}
		}

		let curve = new ArcCurve(
			0, 0,
			entity.r,
			startAngle,
			endAngle
		);

		let points = curve.getPoints( 32 );
		var geometry = new BufferGeometry().setFromPoints( points );
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._geometryHelper.generatePointIndex( points ) ), 1 ) );
    
		let center = {
			x: entity.center ? entity.center.x : entity.x,
			y: entity.center ? entity.center.y : entity.y,
			z: entity.center ? entity.center.z : entity.z
		};
		geometry.translate( entity.extrusionZ < 0 ? -center.x : center.x , center.y, center.z );
		
		return { geometry: geometry, material: material };
	}

	/**
	 * Draws an ellipse entity.
	 * @param entity {entity} dxf parsed ellipse entity.
     * @return {Object} object composed as {geometry: THREE.Geometry, material: THREE.Material}
	*/
	drawEllipse( entity ) {
        
		let lineType = 'line';
        
		if ( entity.lineTypeName ) {
			let ltype = this.data.tables.ltypes[entity.lineTypeName];
			if( ltype && ltype.pattern.length > 0 ) lineType = 'dashed';
		}
        
		let material = this._colorHelper.getMaterial( entity, lineType, this.data.tables );

		let xrad = Math.sqrt( Math.pow( entity.majorX, 2 ) + Math.pow( entity.majorY, 2 ) );
		let yrad = xrad * entity.axisRatio;
		let rotation = Math.atan2( entity.majorY, entity.majorX );

		let center = {
			x: entity.center ? entity.center.x : entity.x,
			y: entity.center ? entity.center.y : entity.y,
			z: entity.center ? entity.center.z : entity.z
		};

		let curve = new EllipseCurve(
			center.x, center.y,
			xrad, yrad,
			entity.startAngle, entity.endAngle,
			false, // Always counterclockwise
			rotation
		);

		let points = curve.getPoints( 32 );
        
		let geometry = new BufferGeometry().setFromPoints( points );
		geometry.setIndex( new BufferAttribute( new Uint16Array( this._geometryHelper.generatePointIndex( points ) ), 1 ) );
    
		this._extrusionTransform( entity, geometry, center );

		return { geometry: geometry, material: material };
	}

	_extrusionTransform( entity, geometry, center ) {
		if( entity.extrusionZ < 0 ) {
			//move to 0
			geometry.translate( -center.x, -center.y, -center.z );
			//mirror
			geometry.scale( -1, 1, 1 );
			//move to original position
			geometry.translate( center.x, center.y, center.z );
		}
	}
	
	_rotateXY( startAngle, endAngle ) {
		const sv = this._geometryHelper.xAxis.clone().applyAxisAngle( this._geometryHelper.zAxis, startAngle ) ;
		const ev = this._geometryHelper.xAxis.clone().applyAxisAngle( this._geometryHelper.zAxis, endAngle );

		sv.applyAxisAngle( this._geometryHelper.yAxis, Math.PI );
		ev.applyAxisAngle( this._geometryHelper.yAxis, Math.PI );

		return [ Math.atan2( sv.y, sv.x ), Math.atan2( ev.y, ev.x ) ];
	}

}