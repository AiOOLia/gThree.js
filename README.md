# gThree.js

#### JavaScript 3D library based on three.js

The aim of the project is to provide alternative renderers with more modern gpu features for three.js.

### Usage

This code creates a scene, a camera, and a geometric cube, and it adds the cube to the scene. It then creates a `WebGPU` renderer for the scene and camera, and it adds that viewport to the `document.body` element. Finally, it animates the cube within the scene for the camera.

```javascript
import * as THREE from 'three';
import * as gTHREE from 'gThree';

// init

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
camera.position.z = 1;

const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

const renderer = new gTHREE.WebGPURenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.init();
document.body.appendChild( renderer.domElement );
animate();

// animation
function animate(  ) {
    requestAnimationFrame( animate );
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;
    mesh.updateMatrixWorld();
    renderer.render( scene, camera );
}
```

### Cloning this repository

```sh
git clone https://github.com/AiOOLia/gThree.js.git
```



