import WebGPUBinding from './WebGPUBinding.js';
import { getFloatLength } from './WebGPUBufferUtils.js';

class WebGPUBuffer extends WebGPUBinding {

	constructor( name, type, visibility = 0, buffer = null ) {

		super( name, visibility );

		this.bytesPerElement = Float32Array.BYTES_PER_ELEMENT;
		this.type = type;

		this.usage = GPUBufferUsage.COPY_DST;

		this.buffer = buffer;
		this.bufferGPU = null; // set by the renderer
		this.bufferOffset = 0;

		this.needsRefreshGPU = false;
	}

	getByteLength() {

		return getFloatLength( this.buffer.byteLength );

	}

	setBuffer(buffer, offset) {
		this.buffer = buffer.buffer;
		this.bufferOffset = offset ? offset : 0;
		this.bufferU16 = new Uint16Array(this.buffer, this.bufferOffset, this.getByteLength()/2);
		this.bufferF32 = new Float32Array(this.buffer, this.bufferOffset, this.getByteLength()/4);
		this.bufferI32 = new Int32Array(this.buffer, this.bufferOffset, this.getByteLength()/4);
		this.bufferU32 = new Uint32Array(this.buffer, this.bufferOffset, this.getByteLength()/4);
	}

	getBuffer() {

		let buffer = this.buffer;

		if ( buffer === null ) {

			const byteLength = this.getByteLength();

			buffer = new Uint16Array( byteLength/2 );
			this.buffer = buffer.buffer;
			this.bufferU16 = buffer;
			this.bufferF32 = new Float32Array(this.buffer);
			this.bufferI32 = new Int32Array(this.buffer);
			this.bufferU32 = new Uint32Array(this.buffer);
		}

		return buffer;

	}

	createGPUBuffer(device, size) {
		let bufferGPU = device.createBuffer( {
			size: size ? size : this.getByteLength(),
			usage: this.usage,
		} );
		//
		this.setGPUBuffer(bufferGPU);
		//
		return bufferGPU;
	}

	setGPUBuffer(gpuBuffer) {
		this.bufferGPU = gpuBuffer;
	}

	updateGPUBuffer(device) {
		device.queue.writeBuffer( this.bufferGPU, this.bufferOffset, this.buffer, this.bufferOffset, this.getByteLength() );
		this.needsRefreshGPU = false;
	}

	update() {

		return true;

	}

	dispose() {
		if(!this.isShared && this.bufferGPU) {
			this.bufferGPU.destroy();
		}
	}


}

WebGPUBuffer.prototype.isBuffer = true;

export default WebGPUBuffer;
