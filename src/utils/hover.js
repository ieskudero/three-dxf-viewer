import { Raycaster } from '../tools/raycaster';

export class Hover extends Raycaster {

	constructor( container, camera, dxf3d, dxf, raycasting = null ) {

		super();
		this.container = container;
		this._clonedObjects = {};
		this.dxf3d = dxf3d;
		this.dxf = dxf;

		//init raycasting
		this._initRaycasting( container, camera, dxf3d, raycasting );

		//create orange hover material that will be seeen above all other materials
		this._setMaterial( 0xffa500 );
		
		this.container.addEventListener( 'pointermove', async( e ) => await this._onPointerMove( e ), false );
	}

	async _onPointerMove( event ) {
		
		event.preventDefault();

		var rect = event.target.getBoundingClientRect();
		const x = event.clientX - rect.left; //x position within the element.
		const y = event.clientY - rect.top;  //y position within the element.
		
		this.pointer.x = ( x / this.container.clientWidth ) * 2 - 1;
		this.pointer.y = - ( y / this.container.clientHeight ) * 2 + 1;
		
		const intersected = this.raycast.raycast( this.pointer );

		this.removeHover();
		if( intersected )  {
			const obj = this._isInsideEntityList( intersected.object ) ? intersected.object : intersected.object.parent;
			if( !obj.userData ) return;

			this.hover( obj );			
			await this.trigger( 'hover', obj );
		}
	}

	hover( obj, material = null ) {
		

		//dimensions are hovered with all the elements
		let dim = null;
		let parent = obj.parent;
		while( dim === null && parent !== null ) {
			if( parent.name === 'DIMENSION' ) dim = parent;
			parent = parent.parent;
		}

		if( dim ) obj = dim;
		
		//clone first
		if( !this._clonedObjects[ obj.uuid ] ) this._clonedObjects[ obj.uuid ] = { clone: this._clone( obj ), parent: obj.parent };
		const cloneData = this._clonedObjects[ obj.uuid ];
		cloneData.clone.hovered = true;
		
		//set material
		cloneData.clone.traverse( c => { if ( c.material ) c.material = material ? material : this._material; } );

		this._hovered = cloneData.clone;

		cloneData.parent.add( this._hovered );
	}

	removeHover() {
		//remove previous hover
		if( this._hovered && this._hovered.parent ) { 
			this._hovered.parent.remove( this._hovered ); 
			this._hovered = null;
		}
	}
}