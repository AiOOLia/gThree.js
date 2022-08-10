import { GPULoadOp} from './constants.js';
import { GPUStoreOp} from "./constants";
import { Color} from "three";
import {BackSide, CubeUVReflectionMapping, FrontSide} from "three";
import {Mesh} from "three";
import {BoxGeometry} from "three";
import {ShaderMaterial} from "three";
import {cloneUniforms} from "../shaders/UniformsUtils";
import {ShaderLib} from "../shaders/WGSL/ShaderLib";
import {PlaneGeometry} from "three";




class WebGPUBackground {

	constructor( renderer, objects, premultipliedAlpha ) {

		this.renderer = renderer;

		this.forceClear = false;
		//
		let _clearAlpha;
		const _clearColor = new Color();
		let planeMesh;
		let boxMesh;

		let currentBackground = null;
		let currentBackgroundVersion = 0;
		let currentTonemapping = null;

		//
		this.update = (renderList, scene)=> {

			const renderer = this.renderer;
			const background = ( scene.isScene === true ) ? scene.background : null;
			let forceClear = this.forceClear;

			if ( !background || !background.isColor) {

				// no background settings, use clear color configuration from the renderer

				_clearColor.copy( renderer._clearColor );
				_clearAlpha = renderer._clearAlpha;

			} else if ( background.isColor === true ) {

				// background is an opaque color

				_clearColor.copy( background );
				_clearAlpha = 1;
				forceClear = true;

			}
			//
			if(!background || background.isColor) {
			}
			else if ( background.isCubeTexture || background.mapping === CubeUVReflectionMapping  ) {

				if ( !boxMesh) {

					boxMesh = new Mesh(
						new BoxGeometry( 1, 1, 1 ),
						new ShaderMaterial( {
							name: 'BackgroundCubeMaterial',
							uniforms: cloneUniforms( ShaderLib.cube.uniforms ),
							vertexShader: ShaderLib.cube.vertexShader,
							fragmentShader: ShaderLib.cube.fragmentShader,
							side: BackSide,
							depthTest: false,
							depthWrite: false,
							fog: false
						} )
					);

					//boxMesh.geometry.deleteAttribute( 'normal' );
					//boxMesh.geometry.deleteAttribute( 'uv' );


					boxMesh.onBeforeRender = function ( renderer, scene, camera ) {

						this.matrixWorld.copyPosition( camera.matrixWorld );

					};

					// enable code injection for non-built-in material
					Object.defineProperty( boxMesh.material, 'envMap', {

						get: function () {

							return this.uniforms.envMap.value;

						}

					} );

					objects.update( boxMesh );

				}

				boxMesh.material.uniforms.envMap.value = background;
				boxMesh.material.uniforms.flipEnvMap.value = ( background.isCubeTexture && background.isRenderTargetTexture === false ) ? - 1 : 1;

				if ( currentBackground !== background ||
					currentBackgroundVersion !== background.version ||
					currentTonemapping !== renderer.toneMapping ) {

					boxMesh.material.needsUpdate = true;

					currentBackground = background;
					currentBackgroundVersion = background.version;
					currentTonemapping = renderer.toneMapping;

				}

				// push to the pre-sorted opaque render list
				renderList.unshift( boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null );

			} else if ( background.isTexture ) {

				if ( planeMesh === undefined ) {

					planeMesh = new Mesh(
						new PlaneGeometry( 2, 2 ),
						new ShaderMaterial( {
							name: 'BackgroundMaterial',
							uniforms: cloneUniforms( ShaderLib.background.uniforms ),
							vertexShader: ShaderLib.background.vertexShader,
							fragmentShader: ShaderLib.background.fragmentShader,
							side: FrontSide,
							depthTest: false,
							depthWrite: false,
							fog: false
						} )
					);

					planeMesh.geometry.deleteAttribute( 'normal' );

					// enable code injection for non-built-in material
					Object.defineProperty( planeMesh.material, 'map', {

						get: function () {

							return this.uniforms.t2D.value;

						}

					} );

					objects.update( planeMesh );

				}

				planeMesh.material.uniforms.t2D.value = background;

				if ( background.matrixAutoUpdate === true ) {

					background.updateMatrix();

				}

				planeMesh.material.uniforms.uvTransform.value.copy( background.matrix );

				if ( currentBackground !== background ||
					currentBackgroundVersion !== background.version ||
					currentTonemapping !== renderer.toneMapping ) {

					planeMesh.material.needsUpdate = true;

					currentBackground = background;
					currentBackgroundVersion = background.version;
					currentTonemapping = renderer.toneMapping;

				}


				// push to the pre-sorted opaque render list
				renderList.unshift( planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null );

			} else {

				console.error( 'THREE.WebGPURenderer: Unsupported background configuration.', background );

			}

			// configure render pass descriptor

			const renderPassDescriptor = renderer._renderPassDescriptor;
			const colorAttachment = renderPassDescriptor.colorAttachments[ 0 ];
			const depthStencilAttachment = renderPassDescriptor.depthStencilAttachment;

			if ( renderer.autoClear === true || forceClear === true ) {

				if ( renderer.autoClearColor === true ) {

					_clearColor.multiplyScalar( _clearAlpha );

					colorAttachment.clearValue = { r: _clearColor.r, g: _clearColor.g, b: _clearColor.b, a: _clearAlpha };
					colorAttachment.loadOp = GPULoadOp.Clear;
					colorAttachment.storeOp = GPUStoreOp.Store;

				} else {

					colorAttachment.loadOp = GPULoadOp.Load;

				}

				if ( renderer.autoClearDepth === true ) {

					depthStencilAttachment.depthClearValue = renderer._clearDepth;
					depthStencilAttachment.depthLoadOp = GPULoadOp.Clear;

				} else {

					depthStencilAttachment.depthLoadOp = GPULoadOp.Load;

				}

				if ( renderer.autoClearStencil === true ) {

					depthStencilAttachment.stencilClearValue = renderer._clearStencil;
					depthStencilAttachment.stencilLoadOp = GPULoadOp.Clear;

				} else {

					depthStencilAttachment.stencilLoadOp = GPULoadOp.Load;

				}

			} else {

				colorAttachment.loadOp = GPULoadOp.Load;
				depthStencilAttachment.depthLoadOp = GPULoadOp.Load;
				depthStencilAttachment.stencilLoadOp = GPULoadOp.Load;

			}

			this.forceClear = false;

		}
	}

	clear() {

		this.forceClear = true;

	}



}

export default WebGPUBackground;
