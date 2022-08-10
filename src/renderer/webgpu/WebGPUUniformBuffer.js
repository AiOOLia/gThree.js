import WebGPUBuffer from './WebGPUBuffer.js';
import { GPUBindingType } from './constants.js';

class WebGPUUniformBuffer extends WebGPUBuffer {

	constructor( name, visibility = 0, buffer = null ) {

		super( name, GPUBindingType.UniformBuffer, visibility, buffer );
		this.usage |= GPUBufferUsage.UNIFORM;

	}
}

WebGPUUniformBuffer.prototype.isUniformBuffer = true;

export default WebGPUUniformBuffer;
