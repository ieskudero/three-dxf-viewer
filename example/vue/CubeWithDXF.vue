<template>
    <input type="file" id="file" @change="handleFileChange" />
    <div ref="canvas" style="width: 100%; height: 100%;"></div>
</template>

<script setup>
import { ref, onMounted, reactive, onUnmounted, watch } from 'vue';
import { Scene, WebGLRenderer, OrthographicCamera, Box3, MOUSE, LinearToneMapping, SRGBColorSpace, Color } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DXFViewer } from '../../src/dxfViewer.js';

// Create a reference for the canvas element
const canvas = ref(null);
const dxfData = reactive({ value: null });
const scene = new Scene();
const camera = new OrthographicCamera();
const renderer = new WebGLRenderer();
let controls;
let dxf;
let lastFile;

// Initialize renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = LinearToneMapping;
renderer.toneMappingExposure = 3;
renderer.setClearColor(new Color(0x212830));

controls = new OrbitControls(camera, renderer.domElement);
controls.zoomSpeed = 2;
controls.enableRotate = false;
controls.mouseButtons = {
    LEFT: MOUSE.PAN,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN
};

// Handle file change
const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (lastFile === file) return;
    lastFile = file;

    if (dxf) scene.remove(dxf);
	const viewer = new DXFViewer();
	viewer.subscribe( 'log', ( message ) => console.log( message ) );
	viewer.subscribe( 'error', ( message ) => console.error( message ) );
	//viewer.subscribe( 'progress', async message => await html.updateMessage( message ) );

    dxf = await viewer.getFromFile(file, "/fonts/helvetiker_regular.typeface.json");
    scene.add(dxf);
    dxfData.value = dxf;

    // Center camera
    centerCamera();
};

onMounted(() => {

    canvas.value.appendChild(renderer.domElement);

    // Add camera to scene
    scene.add(camera);

    // Initialize camera and controls
    const size = 10000;
    let aspect = canvas.value.offsetWidth / canvas.value.offsetHeight;
    camera.left = -size * aspect;
    camera.right = size * aspect;
    camera.top = size;
    camera.bottom = -size;
    camera.zoom = 1;

    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };
    animate();

    centerCamera();
    // Watch for file changes
    watch(() => dxfData.value, () => {
        centerCamera();
    });
});

// Cleanup on unmount
onUnmounted(() => {
    controls.dispose();
    renderer.dispose();
});

// Center camera
function centerCamera() {
    let box = new Box3().setFromObject(scene);

    let bigAxis = box.max.x - box.min.x > box.max.y - box.min.y ? 'x' : 'y';
    let size = bigAxis === 'x' ? box.max.x - box.min.x : box.max.y - box.min.y;
    let sizeFrustum = bigAxis === 'x' ? camera.right - camera.left : camera.top - camera.bottom;

    let lateralMargin = 0.9; //percentage of screento leave on the sides. 1 means no margin
    if (size < sizeFrustum) {
        camera.zoom = lateralMargin * (sizeFrustum / size);
        camera.updateProjectionMatrix();
    }
    else
        camera.zoom = 1;

    let center = box.min.add(box.max.sub(box.min).divideScalar(2));

    camera.position.set(center.x, center.y, center.z + 100);
    controls.target.set(camera.position.x, camera.position.y, center.z);

    camera.updateProjectionMatrix();
}

</script>

<style scoped>
#loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: black;
    color: white;
    opacity: 50%;
    font-size: 5vh;
    text-align: center;
    padding-top: 15vh;
    z-index: 1000;
    display: none;
}

#headerTitle {
    font-size: 25px;
    font-weight: bold;
    color: white;
    text-align: center;
    position: fixed;
    top: 0;
    top: 1vh;
    left: 50%;
    width: 24vh;
    margin-left: -12vh;
    z-index: 1;
}

#file {
    position: fixed;
    top: 1vh;
    left: 1vh;
    color: white;
    font-size: 1.5vh;
    z-index: 2;
}

#canvas3d {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
}
</style>