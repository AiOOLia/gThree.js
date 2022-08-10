import WebGPUBinding from './WebGPUBinding.js';
import { GPUBindingType } from './constants.js';

class WebGPUSampler extends WebGPUBinding {

	constructor( name, texture, bindingPoint = 0, group = 0 ) {

		super( name );

		this.texture = texture;

		this.type = GPUBindingType.Sampler;
		this.visibility = GPUShaderStage.FRAGMENT;

		this.samplerGPU = null; // set by the renderer

		this.bindingPoint = bindingPoint;
		this.group = group;
	}

	clone() {
		const res = new WebGPUSampler(this.name, this.texture, this.bindingPoint, this.group);
		res.type = this.type;
		res.visibility = this.visibility;
		return res;
	}

	getTexture() {

		return this.texture;

	}

}

WebGPUSampler.prototype.isSampler = true;

export default WebGPUSampler;
