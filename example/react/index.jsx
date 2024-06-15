import ReactDOM from 'react-dom/client';
import React from 'react';
import './index.css';
 
import CubeWithDXF from './cubeWithDXF';

const root = ReactDOM.createRoot( document.getElementById( 'root' ) );
root.render(
	<React.StrictMode>
		<CubeWithDXF />
	</React.StrictMode>
);