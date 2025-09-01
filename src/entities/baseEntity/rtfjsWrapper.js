// loader.js
import WMFJSUrl from '../../../node_modules/rtf.js/dist/WMFJS.bundle.min.js?url';
import EMFJSUrl from '../../../node_modules/rtf.js/dist/EMFJS.bundle.min.js?url';

export async function loadEMFJS() {
	if ( window.EMFJS ) return window.EMFJS;

	await new Promise( ( resolve, reject ) => {
		const s = document.createElement( 'script' );
		s.src = EMFJSUrl;           // served by Vite as a classic script asset
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild( s );
	} );

	return window.EMFJS;
}
export async function loadWMFJS() {
	if ( window.WMFJS ) return window.WMFJS;

	await new Promise( ( resolve, reject ) => {
		const s = document.createElement( 'script' );
		s.src = WMFJSUrl;           // served by Vite as a classic script asset
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild( s );
	} );

	return window.WMFJS;
}
