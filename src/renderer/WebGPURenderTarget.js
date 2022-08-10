import {WebGLRenderTarget} from "three";


class WebGPURenderTarget extends WebGLRenderTarget {

	constructor( width, height, options = {} ) {
	    super(width, height, options);
	}
}

export {WebGPURenderTarget};