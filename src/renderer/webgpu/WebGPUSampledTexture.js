import WebGPUBinding from './WebGPUBinding.js';
import { GPUBindingType, GPUTextureViewDimension } from './constants.js';

class WebGPUSampledTexture extends WebGPUBinding {

	constructor( name, texture, bindingPoint = 0, group = 0 ) {

		super( name );

		this.texture = texture;

		this.dimension = GPUTextureViewDimension.TwoD;

		this.type = GPUBindingType.SampledTexture;
		this.visibility = GPUShaderStage.FRAGMENT;

		this.textureGPU = null; // set by the renderer

		this.bindingPoint = bindingPoint;
		this.group = group;

	}

	clone() {
		const res = new WebGPUSampledTexture(this.name, this.texture, this.bindingPoint, this.group);
		res.visibility = this.visibility;
		res.type = this.type;
		return res;
	}

	getTexture() {

		return this.texture;

	}

	dispose() {

	}

}

WebGPUSampledTexture.prototype.isSampledTexture = true;

class WebGPUSampledArrayTexture extends WebGPUSampledTexture {

	constructor( name, texture, bindingPoint, group ) {

		super( name, texture, bindingPoint, group );

		this.dimension = GPUTextureViewDimension.TwoDArray;

	}

	clone() {
		const res = new WebGPUSampledArrayTexture(this.name, this.texture, this.bindingPoint, this.group);
		res.visibility = this.visibility;
		res.type = this.type;
		return res;
	}

}

WebGPUSampledArrayTexture.prototype.isSampledArrayTexture = true;

class WebGPUSampled3DTexture extends WebGPUSampledTexture {

	constructor( name, texture, bindingPoint, group ) {

		super( name, texture, bindingPoint, group );

		this.dimension = GPUTextureViewDimension.ThreeD;

	}

	clone() {
		const res = new WebGPUSampled3DTexture(this.name, this.texture, this.bindingPoint, this.group);
		res.visibility = this.visibility;
		res.type = this.type;
		return res;
	}

}

WebGPUSampled3DTexture.prototype.isSampled3DTexture = true;

class WebGPUSampledCubeTexture extends WebGPUSampledTexture {

	constructor( name, texture, bindingPoint, group ) {

		super( name, texture, bindingPoint, group );

		this.dimension = GPUTextureViewDimension.Cube;

	}

	clone() {
		const res = new WebGPUSampledCubeTexture(this.name, this.texture, this.bindingPoint, this.group);
		res.visibility = this.visibility;
		res.type = this.type;
		return res;
	}

}

WebGPUSampledCubeTexture.prototype.isSampledCubeTexture = true;

export { WebGPUSampledTexture, WebGPUSampledArrayTexture, WebGPUSampled3DTexture, WebGPUSampledCubeTexture };
