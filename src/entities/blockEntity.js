import { Mesh, Group, Line, LineSegments } from 'three';

import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { TextEntity } from './textEntity';
import { SolidEntity } from './solidEntity';
import { CircleEntity } from './circleEntity';
import { SplineEntity } from './splineEntity';
import { HatchEntity } from './hatchEntity';
import { Ole2FrameEntity } from './ole2frameEntity';
import { BlockMerger } from './baseEntity/blockMerger';

/**
 * @class BlockEntity
 * @see {@link baseEntity/BaseEntity.md}
 * @classdesc DXF Block entity class. It uses all the other classes to draw the block's entities.
 */
export class BlockEntity extends BaseEntity {
	constructor( data, font ) { 
		super( data );
		this._font = font;
		this._lineEntity = new LineEntity( data, font );
		this._textEntity = new TextEntity( data, font );
		this._solidEntity = new SolidEntity( data );
		this._circleEntity = new CircleEntity( data );
		this._splineEntity = new SplineEntity( data );
		this._hatchEntity = new HatchEntity( data );
		this._ole2FrameEntity = new Ole2FrameEntity( data );
	}

	/**
	 * Draws the block entity.
	 * @param entity {Entity} DXF block entity.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	async drawBlock( entity, extrusionZ = 1 ) {
        
		let group = new Group();
		group.name = 'BLOCK';
		group.position.set( -entity.x, -entity.y, -entity.z );
		group.userData = { 
			entity: entity,
			entities: []
		};
        
		const hatchEntities = entity.entities.filter( e => e.type === 'HATCH' );
		const nonHatchEntities = entity.entities.filter( e => e.type !== 'HATCH' );

		//iterate over all non hatch entities, so when hatch comes, all other entities that could be boundaries are generated
		for( let i = 0; i < nonHatchEntities.length; i++ ) {
			let _entity = nonHatchEntities[i];

			if( this._hideEntity( _entity ) ) continue;

			const obj3d = await this._generateBlock3d( _entity, extrusionZ );
			if( obj3d ) group.add( obj3d );
		}
		
		const getRefEntity3ds = refs => group.children.filter( e => refs.find( r => r === e.userData.entity.handle ) );
		for( let i = 0; i < hatchEntities.length; i++ ) {
			let _entity = hatchEntities[i];

			if( this._hideEntity( _entity ) ) continue;

			const obj3d = await this._generateBlock3d( _entity, extrusionZ, getRefEntity3ds );
			if( obj3d ) group.add( obj3d );
		}



		this._mergeGroup( group );

		return group;
	}

	async _generateBlock3d( entity, extrusionZ, getRefEntity3ds ) {
		switch ( entity.type ) {
		case 'LINE': {
			let _drawData = this._lineEntity.drawLine( entity, extrusionZ );

			let obj3d = new Line( _drawData.geometry, _drawData.material );
			if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'POLYLINE':
		case 'LWPOLYLINE': {
			let _drawData = this._lineEntity.drawPolyLine( entity, extrusionZ );

			let obj3d = new Line( _drawData.geometry, _drawData.material );
			if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'ARC':
		case 'CIRCLE':  {
			let _enti_drawDatay = this._circleEntity.drawCircle( entity, extrusionZ );

			let obj3d = new Line( _enti_drawDatay.geometry, _enti_drawDatay.material );
			if( _enti_drawDatay.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'ELLIPSE': {
			let _drawData = this._circleEntity.drawEllipse( entity, extrusionZ );

			let obj3d = new Line( _drawData.geometry, _drawData.material );
			if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'SPLINE': {
			let _drawData = this._splineEntity.drawSpline( entity, extrusionZ );

			let obj3d = new Line( _drawData.geometry, _drawData.material );
			if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'SOLID': {
			let _drawData = this._solidEntity.drawSolid( entity, extrusionZ );

			let obj3d = new Mesh( _drawData.geometry, _drawData.material );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'ATTRIB':
		case 'TEXT':
		case 'MTEXT': {
			let _drawData = this._textEntity.drawText( entity, extrusionZ );
			if( !_drawData ) return null;

			let obj3d = new Mesh( _drawData.geometry, _drawData.material );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		case 'INSERT': {
			let block = entity.blockObj ? entity.blockObj : this._getBlock( this.data.blocks, entity.block );
			if( block && block.entities.length > 0 && !this._hideBlockEntity( block ) ) {
				let obj3d = new Group();
				obj3d.name = 'INSERT';
				obj3d.add( await this.drawBlock( block, extrusionZ ) );
				obj3d.userData = { entity: entity };

				let sx = entity.scaleX ? entity.scaleX : 1;
				let sy = entity.scaleY ? entity.scaleY : 1;
				let sz = entity.scaleZ ? entity.scaleZ : 1;
                        
				entity.extrusionZ = entity.extrusionZ < 0 ? -1 : 1;

				obj3d.scale.set( entity.extrusionZ * sx, sy, sz );

				if ( entity.rotation ) {
					obj3d.rotation.z = entity.extrusionZ * entity.rotation * Math.PI / 180;
				}
                        
				obj3d.position.set( entity.extrusionZ * entity.x, entity.y, entity.z );
                    
				return obj3d;
			}
		} break;
		case 'HATCH': {
			let _drawData = this._hatchEntity.drawHatch( entity, getRefEntity3ds );

			if( _drawData.geometry && _drawData.geometry.attributes.position.count > 0 ) {
				let obj3d = entity.fillType === 'SOLID' ? new Mesh( _drawData.geometry, _drawData.material ) : new LineSegments( _drawData.geometry, _drawData.material );
				if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: entity };
				obj3d.renderOrder = entity.fillType === 'SOLID' ? -1 : 0;
				obj3d.position.z = entity.fillType === 'SOLID' ? -0.1 : 0;

				return obj3d;
			}
		} break;
		case 'POINT': {
			//we don't draw anything. We don't need points
		} break;
		case 'ATTDEF': {
			//we don't draw anything, text is drawn in textEntity.js
		} break;
		case 'DIMENSION': {
			//we don't draw anything, all dimension related entities are drawn in each case
		} break;
		case 'OLE2FRAME': {
			let _drawData = await this._ole2FrameEntity.drawOle2Frame( entity, extrusionZ );

			let obj3d = new Mesh( _drawData.geometry, _drawData.material );
			obj3d.userData = { entity: entity };

			return obj3d;
		}
		default: {
			this.trigger( 'log', 'unknown entity type: ' + entity.type );
		} break;
		}
		return null;
	}
	
	_rotate( obj3d, rotation ) {

		if( !rotation || rotation === 0 ) return;
        
		obj3d.rotateOnAxis( this._geometryHelper.zAxis, rotation * Math.PI / 180 );
	}
    
	_hideBlockEntity( entity ) {
		if( entity && entity.name.toLowerCase().startsWith( '*paper_space' ) ) return true;
		return this._hideEntity( entity );
	}

	_mergeGroup( group ) {
		
		const merger = new BlockMerger();

		const mergeAvoid = ( c ) => c.name === 'BLOCK' || c.name === 'INSERT' || c.name === 'DIMENSION';

		// BLOCK
		const blocks = [];
		const joinables = [];
		
		for( let i = 0; i < group.children.length; i++ ) {
			const c = group.children[ i ];
			mergeAvoid( c ) ? blocks.push( c ) : joinables.push( c );
		}

		//remove blocks from children
		for( let i = 0; i < blocks.length; i++ ) group.remove( blocks[ i ] );

		//merge all the rest
		if( joinables.length > 0 ) {

			//store in userData all the entities
			group.userData.entities = [];
			joinables.forEach( c => group.userData.entities.push( c ) );

			merger.merge( group );
		} 

		//add blocks again
		for( let i = 0; i < blocks.length; i++ ) group.add( blocks[ i ] );
	}
}
