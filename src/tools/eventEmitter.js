export class EventEmitter {
	
	constructor() {
		this.callbacks = [];
	}
	
	subscribe( eventName, callback ) {
		const found = this.callbacks.find( ( callbackInfo ) => {
			return callbackInfo.name === eventName;
		} );

		if ( typeof found !== 'undefined' ) {
			found.callbacks.push( callback );
		} else {
			this.callbacks.push( { name: eventName, callbacks: [ callback ] } );
		}
	}

	unSubscribe( eventName, callback ) {
		const found = this.callbacks.find( ( callbackInfo ) => {
			return callbackInfo.name === eventName;
		} );

		if ( typeof found !== 'undefined' ) {
			let index = found.callbacks.indexOf( callback );
			if ( index > -1 ) {
				found.callbacks.splice( index, 1 );
			}
			if ( found.callbacks.length === 0 ) {
				index = this.callbacks.indexOf( found );
				if ( index > -1 ) {
					this.callbacks.splice( index, 1 );
				}
			}
		}
	}

	hasSubscribers( eventName ) {
		const found = this.callbacks.find( ( callbackInfo ) => {
			return callbackInfo.name === eventName;
		} );
		return typeof found !== 'undefined';
	}

	async trigger( eventName, ...e ) {
		const found = this.callbacks.find( ( callbackInfo ) => {
			return callbackInfo.name === eventName;
		} );

		if ( typeof found !== 'undefined' ) {
			for ( const callback of found.callbacks ) {
				if ( callback && callback.constructor.name === 'AsyncFunction' ) await callback( ...e );
				else callback( ...e );
			}
		}
	}
}