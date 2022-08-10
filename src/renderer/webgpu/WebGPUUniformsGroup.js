import WebGPUUniformBuffer from './WebGPUUniformBuffer.js';
import {StructUniform, WebGPUUniform} from "./WebGPUUniform";
import {builtInTypesLayout} from "./WebGPUTypesLayout";

class WebGPUUniformsGroup extends WebGPUUniformBuffer {

	constructor( name, visibility = 0, uniformFilter= null, gpuTypesLayout = builtInTypesLayout ) {
		super( name, visibility);

		// the order of uniforms in this array must match the order of uniforms in the shader

		this.uniforms = [];
		this.index = new Map();
		this.needsUpdate = false;
		this.filter = uniformFilter;
		this.gpuTypesLayout = gpuTypesLayout;
		//
		this._entries = null;
		//
		this._byteLength = -1;
	}

	clone() {
		let res = new WebGPUUniformsGroup(this.name);
		res.uniforms = this.uniforms;
		res.gpuTypesLayout = this.gpuTypesLayout;
		res.filter = this.filter;
		res.index = this.index;
		res.usage = this.usage;
		res.bytesPerElement = this.bytesPerElement;
		res.type = this.type;
		res.visibility = this.visibility;
		res.device = this.device;
		res._byteLength = this._byteLength;
		if(this.mergedUniform) {
			res.merge();
		}
		return res;
	}

	dirty() {
		this._entries = null;
		this._byteLength = -1;
		this.buffer = null;
		this.bufferGPU = null;
		delete this.mergedUniform;
		delete this.mergedStructDef;
	}

	createGPUBuffer(device) {
		super.createGPUBuffer(device);
		//
		for(let i=0, il = this.uniforms.length; i<il; ++i) {
			this.uniforms[i].initBuffer(this);
		}
	}

	setGPUBuffer(gpuBuffer, offset) {
		this.bufferGPU = gpuBuffer;
		this.bufferOffset = offset ? offset : 0;
		if(this._entries) {
			for(let i=0; i<this._entries.length; ++i) {
				this._entries[i].resource.buffer = gpuBuffer;
				this._entries[i].resource.offset = this.bufferOffset;
				this._entries[i].resource.size = this._byteLength;
			}
		}
	}

	bindBufferToUniforms() {
		WebGPUUniform.currentBindingBuffer = this;
	}

	addUniform( uniform ) {

		this.uniforms.push( uniform );
		this.index.set(uniform.name, this.uniforms.length-1);
		this.dirty();

		return this;

	}

	removeUniform( uniform ) {

		const index = this.index.get(uniform.name);

		if ( index !== - 1 ) {

			this.uniforms.splice( index, 1 );

		}

		this.dirty();

		return this;

	}

	hasUniform( name ) {
		return this.index.has(name);
	}

	getUniform( name ) {
		return this.uniforms[this.index.get(name)];
	}

	merge() {
		this.getByteLength();
		//
		if(this.uniforms.length === 1 && this.uniforms[0].isStructniform) {
			this.mergedUniform = this.uniforms[0];
			this.getBuffer();
		} else {
			let structName = this.name.toUpperCase();
			let structDef = 'struct ' + structName  + '{\n';
			for ( let i = 0, l = this.uniforms.length; i < l; i ++ ) {
				const uniform = this.uniforms[ i ];
				structDef += uniform.name + ':' + uniform.valueType;
				if(i!==l-1) {
					structDef += ',\n';
				}
			}
			structDef += '\n}';
			//
			this.mergedUniform = new StructUniform(this.name, structName, {
				alignment: this._maxAlignment,
				size: this._byteLength
			}, this.getBuffer(), this.uniforms[0].bindingPoint, this.uniforms[0].group);

			// this.mergedUniform = {
			// 	bindingPoint: this.uniforms[0].bindingPoint,
			// 	group: this.uniforms[0].group,
			// 	layout:{
			// 	    alignment: this._maxAlignment,
			// 		size: this._byteLength
			//     },
			// 	name: this.name,
			// 	value: this.getBuffer(),
			// 	valueType : structName
			// }

			this.mergedStructDef = structDef;
		}
	}

	getByteLength() {
		if(this._byteLength > 0) {
			return this._byteLength;
		}

		//OffsetOfMember(S, 1) = 0
		//OffsetOfMember(S, i) = roundUp(AlignOfMember(S, i ), OffsetOfMember(S, i-1) + SizeOfMember(S, i-1))

		//roundUp(k, n) = ⌈n ÷ k⌉ × k
		let roundUp = (k, n)=> {
			return Math.ceil(n/k)*k;
		}

		let alignment = 0;
		for ( let i = 0, l = this.uniforms.length; i < l; i ++ ) {

			const uniform = this.uniforms[ i ];

			// offset within a single chunk in bytes

			uniform.offset = i === 0 ? 0 : roundUp(uniform.layout.alignment, this.uniforms[i-1].offset + this.uniforms[i-1].layout.size);
			alignment = uniform.layout.alignment > alignment ? uniform.layout.alignment : alignment;
		}
		//
		const last = this.uniforms[this.uniforms.length - 1];
		this._maxAlignment = alignment;
		this._byteLength = roundUp(alignment, last.offset + last.layout.size);
		return this._byteLength;
	}


	getEntries() {
		if(this._entries) {
			return this._entries;
		}
		//
		if(this.mergedUniform) {
			this._entries =  [{
				binding: this.mergedUniform.bindingPoint,
				resource: {
					buffer: this.bufferGPU,
					offset: this.bufferOffset ? this.bufferOffset : 0,
					size: this._byteLength
				}
			}];
			//
			return this._entries;
		}
		//
		this.getByteLength();
		//
		let entries = [];
		for ( let i = 0, l = this.uniforms.length; i < l; i ++ ) {
			const uniform = this.uniforms[ i ];
			entries[entries.length] = {
				binding: uniform.bindingPoint,
				resource: {
					buffer: this.bufferGPU,
					offset: this.bufferOffset ? this.bufferOffset + uniform.offset : uniform.offset,
					size: uniform.layout.size
				}
			}
		}
		//
		this._entries = entries;
		return entries;
	}
}

WebGPUUniformsGroup.prototype.isUniformsGroup = true;

export default WebGPUUniformsGroup;
