import { Mesh, Group, Line, LineSegments } from 'three';

import { BaseEntity } from './baseEntity/baseEntity';
import { LineEntity } from './lineEntity';
import { TextEntity } from './textEntity';
import { SolidEntity } from './solidEntity';
import { CircleEntity } from './circleEntity';
import { SplineEntity } from './splineEntity';
import { HatchEntity } from './hatchEntity';
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
	}

	/**
	 * Draws the block entity.
	 * @param entity {Entity} DXF block entity.
     * @return {THREE.Group} ThreeJS object with all the generated geometry. DXF entity is added into userData
	*/
	drawBlock( entity, extrusionZ = 1 ) {
        
		let group = new Group();
		group.name = 'BLOCK';
		group.position.set( -entity.x, -entity.y, -entity.z );
		group.userData = { 
			entity: entity,
			entities: []
		};
        
		for( let i = 0; i < entity.entities.length; i++ ) {
			let _entity = entity.entities[i];

			if( this._hideEntity( _entity ) ) continue;
            
			switch ( _entity.type ) {
			case 'LINE': {
				let _drawData = this._lineEntity.drawLine( _entity, extrusionZ );

				let obj3d = new Line( _drawData.geometry, _drawData.material );
				if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'POLYLINE':
			case 'LWPOLYLINE': {
				let _drawData = this._lineEntity.drawPolyLine( _entity, extrusionZ );

				let obj3d = new Line( _drawData.geometry, _drawData.material );
				if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'ARC':
			case 'CIRCLE':  {
				let _enti_drawDatay = this._circleEntity.drawCircle( _entity, extrusionZ );

				let obj3d = new Line( _enti_drawDatay.geometry, _enti_drawDatay.material );
				if( _enti_drawDatay.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'ELLIPSE': {
				let _drawData = this._circleEntity.drawEllipse( _entity, extrusionZ );

				let obj3d = new Line( _drawData.geometry, _drawData.material );
				if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'SPLINE': {
				let _drawData = this._splineEntity.drawSpline( _entity, extrusionZ );

				let obj3d = new Line( _drawData.geometry, _drawData.material );
				if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'SOLID': {
				let _drawData = this._solidEntity.drawSolid( _entity, extrusionZ );

				let obj3d = new Mesh( _drawData.geometry, _drawData.material );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'ATTRIB':
			case 'TEXT':
			case 'MTEXT': {
				let _drawData = this._textEntity.drawText( _entity, extrusionZ );

				let obj3d = new Mesh( _drawData.geometry, _drawData.material );
				obj3d.userData = { entity: _entity };

				group.add( obj3d );
			} break;
			case 'INSERT': {
				let block = _entity.blockObj ? _entity.blockObj : this._getBlock( this.data.blocks, _entity.block );
				if( block && block.entities.length > 0 && !this._hideBlockEntity( block ) ) {
					let obj3d = new Group();
					obj3d.name = 'INSERT';
					obj3d.add( this.drawBlock( block, extrusionZ ) );
					obj3d.userData = { entity: _entity };

					let sx = _entity.scaleX ? _entity.scaleX : 1;
					let sy = _entity.scaleY ? _entity.scaleY : 1;
					let sz = _entity.scaleZ ? _entity.scaleZ : 1;
                        
					_entity.extrusionZ = _entity.extrusionZ < 0 ? -1 : 1;

					obj3d.scale.set( _entity.extrusionZ * sx, sy, sz );

					if ( _entity.rotation ) {
						obj3d.rotation.z = _entity.extrusionZ * _entity.rotation * Math.PI / 180;
					}
                        
					obj3d.position.set( _entity.extrusionZ * _entity.x, _entity.y, _entity.z );
                    
					group.add( obj3d );
				}
			} break;
			case 'HATCH': {
				let _drawData = this._hatchEntity.drawHatch( _entity, extrusionZ );

				if( _drawData.geometry ) {
					let obj3d = _entity.fillType === 'SOLID' ? new Mesh( _drawData.geometry, _drawData.material ) : new LineSegments( _drawData.geometry, _drawData.material );
					if( _drawData.material.type === 'LineDashedMaterial' ) this._geometryHelper.fixMeshToDrawDashedLines( obj3d );
					obj3d.userData = { entity: _entity };
					obj3d.renderOrder = _entity.fillType === 'SOLID' ? -1 : 0;
					obj3d.position.z = _entity.fillType === 'SOLID' ? -0.1 : 0;

					group.add( obj3d );
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
			default: {
				console.log( 'unknown entity type: ' + _entity.type );
			} break;
			}
		}

		this._mergeGroup( group );

		return group;
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
