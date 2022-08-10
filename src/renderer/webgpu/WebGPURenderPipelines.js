import WebGPURenderPipeline from './WebGPURenderPipeline.js';
import WebGPUProgrammableStage from './WebGPUProgrammableStage.js';

class WebGPURenderPipelines {

	constructor( renderer, device, sampleCount, shaderSources, bindGroupLayouts ) {
		this.renderer = renderer;
		this.device = device;
		this.sampleCount = sampleCount;
		this.shaderSources = shaderSources;
		this.bindGroupLayouts = bindGroupLayouts;

		this.pipelineCache = new Map();
		this.pipelineLayoutCache = new Map();
		this.objectCache = new WeakMap();

		this.stages = {
			vertex: new Map(),
			fragment: new Map()
		};
	}

	get( object, material, lights, shadows, scene) {
		const device = this.device;

		let currentPipeline;

		const cache = this._getCache(object, material);

		if(this._needsUpdate(object, material, cache)) {
			// programmable stages
			const shaderSource = this.shaderSources.getGraphShaderSource( object, material, lights, shadows, scene, this.renderer);

			let stageVertex = this.stages.vertex.get( shaderSource.vertexShader );

			if ( stageVertex === undefined ) {

				stageVertex = new WebGPUProgrammableStage( device, shaderSource.vertexShader, 'vertex' );
				this.stages.vertex.set( shaderSource.vertexShader, stageVertex );

			}

			let stageFragment = this.stages.fragment.get( shaderSource.fragmentShader );

			if ( stageFragment === undefined ) {

				stageFragment = new WebGPUProgrammableStage( device, shaderSource.fragmentShader, 'fragment' );
				this.stages.fragment.set( shaderSource.fragmentShader, stageFragment );
			}

			// determine render pipeline

			currentPipeline = this._acquirePipeline( stageVertex, stageFragment, object, material, shaderSource );
			cache.currentPipeline = currentPipeline;

			// keep track of all used times
			stageVertex.usedTimes ++;
			stageFragment.usedTimes ++;
		} else {

			currentPipeline = cache.currentPipeline;
		}

		//
		currentPipeline.bindingMaterials.add(material);

		return currentPipeline;
	}

	dispose() {
		this.shaderModules = {
			vertex: new Map(),
			fragment: new Map()
		};
	}

	_acquirePipeline( stageVertex, stageFragment, object, material, shaderSource ) {
		let pipeline;
		// check for existing pipeline
		const cacheKey = this._computeCacheKey( stageVertex, stageFragment, material );
		if(this.pipelineCache.has(cacheKey)) {
			pipeline = this.pipelineCache.get(cacheKey);
		}
		//
		if ( pipeline === undefined ) {

			pipeline = new WebGPURenderPipeline( this.device, shaderSource, this.renderer, this.sampleCount );
			let bindGroupLayouts = this.bindGroupLayouts.get(shaderSource.bindGroupLayoutEntries);
			let pipelineLayout;
			if(this.pipelineLayoutCache.has(bindGroupLayouts.cacheKey)) {
				pipelineLayout = this.pipelineLayoutCache.get(bindGroupLayouts.cacheKey);
			} else {
				pipelineLayout = this.device.createPipelineLayout({bindGroupLayouts: bindGroupLayouts.bindGroupLayouts});
				this.pipelineLayoutCache.set(bindGroupLayouts.cacheKey, pipelineLayout);
			}
			pipeline.init(pipelineLayout, stageVertex, stageFragment, object, material, shaderSource);
			pipeline.bindGroupLayouts = bindGroupLayouts.bindGroupLayouts;

			pipeline.cacheKey = cacheKey;
			this.pipelineCache.set(cacheKey, pipeline);
		}

		return pipeline;
	}

	_computeCacheKey( stageVertex, stageFragment, material ) {

		const renderer = this.renderer;

		const parameters = [
			stageVertex.id, stageFragment.id,
			material.transparent, material.blending, material.premultipliedAlpha,
			material.blendSrc, material.blendDst, material.blendEquation,
			material.blendSrcAlpha, material.blendDstAlpha, material.blendEquationAlpha,
			material.colorWrite,
			material.depthWrite, material.depthTest, material.depthFunc,
			material.stencilWrite, material.stencilFunc,
			material.stencilFail, material.stencilZFail, material.stencilZPass,
			material.stencilFuncMask, material.stencilWriteMask,
			material.side, material.wireframe,
			this.sampleCount,
			renderer.getCurrentEncoding(), renderer.getCurrentColorFormat(), renderer.getCurrentDepthStencilFormat()
		];

		return parameters.join();

	}


	_getCache( object, material ) {
		let objCache = this.objectCache.get( object );
		let mtlCache;

		if ( objCache === undefined ) {

			objCache = {
				mtlCache: new WeakMap(),
			};

			this.objectCache.set( object, objCache );
		}
		//
		mtlCache = objCache.mtlCache.get(material);
		if(!mtlCache) {
			mtlCache = {
			}
			objCache.mtlCache.set(material, mtlCache);
		}

		return mtlCache;
	}

	releasePipeline( pipeline, material, onShaderSourceDispose ) {

		if ( pipeline.bindingMaterials.size ===0 ) {

			this.pipelineCache.delete(pipeline.cacheKey);

			this._releaseStage( pipeline.stageVertex );
			this._releaseStage( pipeline.stageFragment );

			this.shaderSources.releaseShaderSource(pipeline.shaderSource, material, onShaderSourceDispose);
		}
	}

	_releaseStage( stage ) {

		if ( -- stage.usedTimes === 0 ) {

			const code = stage.code;
			const type = stage.type;

			this.stages[ type ].delete( code );
		}

	}


	_needsUpdate( object, material, cache ) {

		let needsUpdate = false;

		// check material state

		if ( cache.material !== material || cache.materialVersion !== material.version ||
			cache.transparent !== material.transparent || cache.blending !== material.blending || cache.premultipliedAlpha !== material.premultipliedAlpha ||
			cache.blendSrc !== material.blendSrc || cache.blendDst !== material.blendDst || cache.blendEquation !== material.blendEquation ||
			cache.blendSrcAlpha !== material.blendSrcAlpha || cache.blendDstAlpha !== material.blendDstAlpha || cache.blendEquationAlpha !== material.blendEquationAlpha ||
			cache.colorWrite !== material.colorWrite ||
			cache.depthWrite !== material.depthWrite || cache.depthTest !== material.depthTest || cache.depthFunc !== material.depthFunc ||
			cache.stencilWrite !== material.stencilWrite || cache.stencilFunc !== material.stencilFunc ||
			cache.stencilFail !== material.stencilFail || cache.stencilZFail !== material.stencilZFail || cache.stencilZPass !== material.stencilZPass ||
			cache.stencilFuncMask !== material.stencilFuncMask || cache.stencilWriteMask !== material.stencilWriteMask ||
			cache.side !== material.side
		) {

			cache.material = material; cache.materialVersion = material.version;
			cache.transparent = material.transparent; cache.blending = material.blending; cache.premultipliedAlpha = material.premultipliedAlpha;
			cache.blendSrc = material.blendSrc; cache.blendDst = material.blendDst; cache.blendEquation = material.blendEquation;
			cache.blendSrcAlpha = material.blendSrcAlpha; cache.blendDstAlpha = material.blendDstAlpha; cache.blendEquationAlpha = material.blendEquationAlpha;
			cache.colorWrite = material.colorWrite;
			cache.depthWrite = material.depthWrite; cache.depthTest = material.depthTest; cache.depthFunc = material.depthFunc;
			cache.stencilWrite = material.stencilWrite; cache.stencilFunc = material.stencilFunc;
			cache.stencilFail = material.stencilFail; cache.stencilZFail = material.stencilZFail; cache.stencilZPass = material.stencilZPass;
			cache.stencilFuncMask = material.stencilFuncMask; cache.stencilWriteMask = material.stencilWriteMask;
			cache.side = material.side;

			needsUpdate = true;

		}

		// check object state
		//todo;
		// check renderer state

		const renderer = this.renderer;

		const encoding = renderer.getCurrentEncoding();
		const colorFormat = renderer.getCurrentColorFormat();
		const depthStencilFormat = renderer.getCurrentDepthStencilFormat();

		if ( cache.sampleCount !== this.sampleCount || cache.encoding !== encoding ||
			cache.colorFormat !== colorFormat || cache.depthStencilFormat !== depthStencilFormat ) {

			cache.sampleCount = this.sampleCount;
			cache.encoding = encoding;
			cache.colorFormat = colorFormat;
			cache.depthStencilFormat = depthStencilFormat;

			needsUpdate = true;

		}

		return needsUpdate;
	}

}

export default WebGPURenderPipelines;
