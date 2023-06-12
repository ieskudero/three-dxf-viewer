import { Box3, Vector3 } from 'three';
import { Raycaster } from '../tools/raycaster';

export class Select extends Raycaster {
	constructor( container, camera, dxf, raycasting = null ) {
		
		super();
		this.container = container;
		this.camera = camera;
		this.dxf = dxf;

		//init raycasting
		this._initRaycasting( container, camera, dxf, raycasting );

		//create orange hover material that will be seeen above all other materials
		this._setMaterial( 0x0000ff );

		this.selecteds = [];
		this._boxHelpers = {
			start3dpoint: new Vector3(),
			end3dpoint: new Vector3(),
			boxMin : new Vector3(),
			boxMax : new Vector3(),
		};
		
		this.container.addEventListener( 'pointerdown', async( e ) => await this._onPointerDown( e ), false );
		this.container.addEventListener( 'pointerup', async( e ) => await this._onPointerUp( e ), false );
		this.container.addEventListener( 'pointermove', async( e ) => await this._onPointerMove( e ), false );
	}

	async _onPointerDown( event ) {

		//if control is pushed start selection box
		if( event.ctrlKey && event.button !== 2 ) {
			this._onSelectionBox = {
				start: { x: event.clientX, y: event.clientY },
				end: { x: event.clientX, y: event.clientY }
			};
			return;
		}
	}

	async _onPointerUp( event ) {
		//if mouse right button return
		if( event.button === 2 ) return;
		if( this._moving ) { this._moving = false; return; }

		event.preventDefault();

		this._deselectAll();


		//TRY TO SELECT USING SELECTION BOX
		let ss = null;
		if( this._onSelectionBox ) {
			const objs = this._getEntitiesUnderSelectionBox( this._onSelectionBox.start, this._onSelectionBox.end );
			if( objs ) ss = objs;
		} else {

			//SELECT BY RAYCASTING		
			this.pointer.x = ( event.clientX / this.container.clientWidth ) * 2 - 1;
			this.pointer.y = - ( event.clientY / this.container.clientHeight ) * 2 + 1;
			
			const intersected = await this.raycast.raycast( this.pointer );
			if( intersected )  ss = intersected.object.parent;
		}

		if( ss ) this._select( ss );

		//CLEAN UP
		this._removeSelectionBox();
		this._onSelectionBox = null;
	}

	async _onPointerMove( event ) {
		if( this._onSelectionBox ) {
			this._onSelectionBox.end = { x: event.clientX, y: event.clientY };
			this.drawSelectionBox( this._onSelectionBox.start, this._onSelectionBox.end );
			return;
		}
	}

	drawSelectionBox( start, end ) {
		this._removeSelectionBox();

		const width = Math.max( start.x, end.x ) - Math.min( start.x, end.x );
		const height = Math.max( start.y, end.y ) - Math.min( start.y, end.y );

		this._selectionBox = document.createElement( 'div' );
		//STYLE
		this._selectionBox.style.position = 'absolute';
		this._selectionBox.style.border = '1px solid white';
		this._selectionBox.style.left = Math.min( start.x, end.x ) + 'px';
		this._selectionBox.style.top = Math.min( start.y, end.y ) + 'px';
		this._selectionBox.style.width = width + 'px';
		this._selectionBox.style.height = height + 'px';
		this._selectionBox.style.pointerEvents = 'none'; this._selectionBox.style.background= 'blue';
		this._selectionBox.style.opacity = 0.25;

		document.body.appendChild( this._selectionBox );
	}

	_removeSelectionBox() {
		if( this._selectionBox ) {
			document.body.removeChild( this._selectionBox );
			this._selectionBox = null;
		}
	}

	_getEntitiesUnderSelectionBox( start, end ) {
		
		//transform screen coordinates to 3d coordinates
		start.x = ( start.x / this.container.clientWidth ) * 2 - 1;
		start.y = - ( start.y / this.container.clientHeight ) * 2 + 1;
		end.x = ( end.x / this.container.clientWidth ) * 2 - 1;
		end.y = - ( end.y / this.container.clientHeight ) * 2 + 1;
		this._boxHelpers.start3dpoint = new Vector3( start.x, start.y, 0 ).unproject( this.camera );
		this._boxHelpers.end3dpoint = new Vector3( end.x, end.y, 0 ).unproject( this.camera );

		//get box min and max
		this._boxHelpers.boxMin.set(
			Math.min( this._boxHelpers.start3dpoint.x, this._boxHelpers.end3dpoint.x ),
			Math.min( this._boxHelpers.start3dpoint.y, this._boxHelpers.end3dpoint.y ),
			0
		);
		this._boxHelpers.boxMax.set(
			Math.max( this._boxHelpers.start3dpoint.x, this._boxHelpers.end3dpoint.x ),
			Math.max( this._boxHelpers.start3dpoint.y, this._boxHelpers.end3dpoint.y ),
			0
		);

		const box = new Box3( this._boxHelpers.boxMin, this._boxHelpers.boxMax );

		const blocks = this._getBlocksUnderBox( box, this.dxf );

		return blocks.length > 0 ? blocks : null;
	}

	_getBlocksUnderBox( box, root ) {

		const blocks = [];
		if( !root || !root.children ) return blocks;

		if( root.name !== '' && this._fitInsideBox( box, root ) ) {
			blocks.push( root );
		} else {
			for( let i = 0; i < root.children.length; i++ ) {
				const child = root.children[ i ];
				const b = this._getBlocksUnderBox( box, child );
				if( b.length > 0 ) blocks.push( ...b );
			}
		}

		return blocks;
	}

	_fitInsideBox( box, root ) {
		let b = new Box3().setFromObject( root );
		
		return box.containsBox( b );
	}


	_select( obj ) {
		const objs = obj instanceof Array ? obj : [ obj ];
		objs.forEach( o => {
			const clone = this._clone( o );
			clone.traverse( c => { if ( c.material ) c.material = this._material; } );
			o.parent.add( clone );
			this.selecteds.push( clone );
		} );
	}

	_deselectAll() {
		if( this.selecteds ) {
			this.selecteds.forEach( s => s.parent.remove( s ) );
			this.selecteds.length = 0;
		}
	}
}