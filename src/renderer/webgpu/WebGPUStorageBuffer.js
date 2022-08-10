import WebGPUBuffer from './WebGPUBuffer.js';
import { GPUBindingType } from './constants.js';
import {WebGPUUniform} from "./WebGPUUniform";
import {GPUAccessMode} from "./constants";
import {builtInTypesLayout} from "./WebGPUTypesLayout";

class WebGPUStorageBuffer extends WebGPUBuffer {

	constructor( name, visibility = 0, filter = null, accessMode = GPUAccessMode.ReadWrite, params={}) {

		super( name, GPUBindingType.StorageBuffer, visibility);

		this.usage |= GPUBufferUsage.STORAGE;
		if(params.needsCopy) {
			this.usage |= GPUBufferUsage.COPY_SRC;
		}
		this.accessMode = accessMode;
		this.filter = filter;
		this.gpuTypesLayout = params.gpuTypesLayout ? params.gpuTypesLayout : builtInTypesLayout;
		if(params.uniform) {
			this.uniform = params.uniform;
			this.binding = params.uniform.bindingPoint;
			this.group = params.uniform.group;
		}
	}

	clone() {
		let res = new WebGPUStorageBuffer(this.name, this.visibility, this.filter, this.accessMode);
		res.uniform = this.uniform;
		res.gpuTypesLayout = this.gpuTypesLayout;
		res.binding = this.binding;
		res.group = this.group;
		res.filter = this.filter;
		res.usage = this.usage;
		res.bytesPerElement = this.bytesPerElement;
		res.type = this.type;
		res.visibility = this.visibility;
		res.device = this.device;
		res._byteLength = this._byteLength;
		return res;
	}

	setBuffer(buffer, offset) {
		super.setBuffer(buffer, offset);
	}

	setValue(value, offset=0) {
		if(ArrayBuffer.isView(value)) {
			super.setBuffer(value, offset);
		}
	}

	set value(value) {
		this.setValue(value);
	}

	setBufferFromAttribute(attribute) {
		this.usage |= GPUBufferUsage.VERTEX;
		this._attribute = attribute;
	}

	createGPUBuffer(device, size, needsCopy) {
		if(needsCopy) {
			this.usage |= GPUBufferUsage.COPY_SRC;
		}
		return super.createGPUBuffer(device, size);
	}

	setGPUBuffer(gpuBuffer, offset) {
		this.bufferGPU = gpuBuffer;
		this.bufferOffset = offset ? offset : 0;
		// if(this._entries) {
		// 	for(let i=0; i<this._entries.length; ++i) {
		// 		this._entries[i].resource.buffer = gpuBuffer;
		// 		this._entries[i].resource.offset = this.bufferOffset;
		// 		this._entries[i].resource.size = this._byteLength;
		// 	}
		// }
	}

	getByteLength() {
		if(!this.uniform || this.uniform.layout.size < 0) {
			return -1;
		}
		//
		if(this._byteLength > 0) {
			return this._byteLength;
		}

		//OffsetOfMember(S, 1) = 0
		//OffsetOfMember(S, i) = roundUp(AlignOfMember(S, i ), OffsetOfMember(S, i-1) + SizeOfMember(S, i-1))

		//roundUp(k, n) = ⌈n ÷ k⌉ × k
		let roundUp = (k, n)=> {
			return Math.ceil(n/k)*k;
		}

		let alignment = this.uniform.layout.alignment;
		//
		this._maxAlignment = alignment;
		this._byteLength = roundUp(alignment, this.uniform.layout.size);
		return this._byteLength;
	}

	bindBufferToUniforms() {
		WebGPUUniform.currentBindingBuffer = this;
	}
}

WebGPUStorageBuffer.prototype.isStorageBuffer = true;

export default WebGPUStorageBuffer;
