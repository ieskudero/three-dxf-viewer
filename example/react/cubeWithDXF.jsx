import React, { useRef, useEffect, useState } from 'react';
import { Scene, WebGLRenderer, OrthographicCamera, Box3, MOUSE, LinearToneMapping, SRGBColorSpace, Color } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DXFViewer } from '../../src/dxfViewer.js';

const CubeWithDXF = () => {
  const canvasRef = useRef(null);
  const [dxfData, setDxfData] = useState(null);
  const [scene] = useState(new Scene());

  useEffect(() => {

	// renderer
    const renderer = new WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.toneMapping = LinearToneMapping;
	renderer.toneMappingExposure = 3;

	// scene
	scene.background = new Color( 0x212830 );
	
	// camera
	const size = 10000;
	let aspect = canvasRef.current.offsetWidth / canvasRef.current.offsetHeight;
	const camera = new OrthographicCamera( -size * aspect , size * aspect , size, -size, -size/2, size );

	//controls
	const controls = new OrbitControls( camera, renderer.domElement );
	controls.zoomSpeed = 2;
	controls.enableRotate = false;
	controls.mouseButtons = {
		LEFT: MOUSE.PAN,
		MIDDLE: MOUSE.DOLLY,
		RIGHT: MOUSE.PAN
	};

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
	  controls.update();
      renderer.render(scene, camera);
    }

	function centerCamera() {
		let box = new Box3().setFromObject( scene );
	
		let bigAxis = box.max.x - box.min.x > box.max.y - box.min.y ? 'x' : 'y';
		let size = bigAxis === 'x' ? box.max.x - box.min.x : box.max.y - box.min.y;
		let sizeFrustum = bigAxis === 'x' ? camera.right - camera.left : camera.top - camera.bottom;
		
		let lateralMargin = 0.9; //percentage of screento leave on the sides. 1 means no margin
		if( size < sizeFrustum ) { 
			camera.zoom = lateralMargin * ( sizeFrustum / size ); 
			camera.updateProjectionMatrix();
		}
		else 
			camera.zoom = 1;
	
		let center = box.min.add( box.max.sub( box.min ).divideScalar( 2 ) );
		
		camera.position.set( center.x , center.y, center.z + 100 );
		controls.target.set( camera.position.x, camera.position.y, center.z );
		
		camera.updateProjectionMatrix();
	}

	if( dxfData ) centerCamera();
	animate();

    return () => {
      // Cleanup on unmount
      renderer.dispose();
    };
  }, [dxfData]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    const font = 'fonts/helvetiker_regular.typeface.json'; // Adjust font path if needed

    try {
      const dxf = await new DXFViewer().getFromFile(file, font);
	  
      // Add the DXF geometry to the scene
      scene.add(dxf);

      setDxfData(dxf);
    } catch (error) {
      console.error('Error loading DXF file:', error);
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <input type="file" id="file" onChange={handleFileChange} />
    </div>
  );
};

export default CubeWithDXF;