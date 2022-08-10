import { REVISION } from './constants.js';

import './three/core/BufferAttribute';
import './three/core/Object3D';
import './three/math/Color';


export { TextureLoader } from './loaders/TextureLoader';
export { CubeTextureLoader } from './loaders/CubeTextureLoader';
export { WebGPURenderTarget } from './renderer/WebGPURenderTarget.js';
export { WebGPURenderer } from './renderer/WebGPURenderer.js';
export { WebGPUComputeTask, WebGPUComputer } from './renderer/WebGPUComputer.js';
export { ShaderLib as WGLShaderLib } from './renderer/shaders/WGSL/ShaderLib.js';
export { UniformsLib } from './renderer/shaders/UniformsLib.js';
export { UniformsUtils } from './renderer/shaders/UniformsUtils.js';
export { ShaderChunk as WGLShaderChunk} from './renderer/shaders/WGSL/ShaderChunk.js';
export * from './constants.js';

if ( typeof __gTHREE_DEVTOOLS__ !== 'undefined' ) {

	__gTHREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'register', { detail: {
		revision: REVISION,
	} } ) );

}

if ( typeof window !== 'undefined' ) {

	if ( window.__gTHREE__ ) {

		console.warn( 'WARNING: Multiple instances of gThree.js being imported.' );

	} else {

		window.__gTHREE__ = REVISION;

	}

}
