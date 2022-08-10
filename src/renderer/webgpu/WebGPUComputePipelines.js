import WebGPUProgrammableStage from './WebGPUProgrammableStage.js';

class WebGPUComputePipelines {

	constructor( device, shaderSources, bindGroupLayouts ) {

		this.device = device;

		this.shaderSources = shaderSources;
		this.bindGroupLayouts = bindGroupLayouts;
		this.pipelineLayoutCache = new Map();
		this.pipelines = new WeakMap();
		this.stages = {
			compute: new WeakMap()
		};
	}

	get( param ) {

		const shaderSource = this.shaderSources.getComputeShaderSource( param.shader);
		//
		let pipeline = this.pipelines.get( shaderSource );

		// @TODO: Reuse compute pipeline if possible, introduce WebGPUComputePipeline

		if ( pipeline === undefined ) {

			const device = this.device;

			// programmable stage
			let stageCompute = this.stages.compute.get( shaderSource );

			if ( stageCompute === undefined ) {

 				stageCompute = new WebGPUProgrammableStage( device, shaderSource.computeShader, 'compute' );

				this.stages.compute.set( shaderSource, stageCompute );
			}

			let bindGroupLayouts = this.bindGroupLayouts.get(shaderSource.bindGroupLayoutEntries);
			let pipelineLayout;
			if(this.pipelineLayoutCache.has(bindGroupLayouts.cacheKey)) {
				pipelineLayout = this.pipelineLayoutCache.get(bindGroupLayouts.cacheKey);
			} else {
				pipelineLayout = device.createPipelineLayout({bindGroupLayouts: bindGroupLayouts.bindGroupLayouts});
				this.pipelineLayoutCache.set(bindGroupLayouts.cacheKey, pipelineLayout);
			}

			pipeline = {
				pipeline:device.createComputePipeline( {
					layout: pipelineLayout,
					compute: stageCompute.stage
				}),
				bindGroupLayouts: bindGroupLayouts,
				shaderSource: shaderSource
			};

			this.pipelines.set( shaderSource, pipeline );
		}

		return pipeline;

	}

	dispose() {

		this.pipelines = new WeakMap();
		this.stages = {
			compute: new WeakMap()
		};

	}

}

export default WebGPUComputePipelines;
