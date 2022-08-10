import WebGPUComputePipelines from "./webgpu/WebGPUComputePipelines";
import {UniformFilter} from "./shaders/UniformsLib";
import {GPUFeatureName, GPULoadOp, GPUStoreOp} from "./webgpu/constants";
import WebGPUInfo from "./webgpu/WebGPUInfo";
import {WebGPUShaderSources} from "./webgpu/WebGPUShaderSources";
import WebGPUProperties from "./webgpu/WebGPUProperties";
import WebGPUBindGroupLayouts from "./webgpu/WebGPUBindGroupLayouts";
import WebGPUAttributes from "./webgpu/WebGPUAttributes";
import WebGPUGeometries from "./webgpu/WebGPUGeometries";
import WebGPUTextures from "./webgpu/WebGPUTextures";
import WebGPUObjects from "./webgpu/WebGPUObjects";
import WebGPUBindings from "./webgpu/WebGPUBindings";

class WebGPUComputeTask {
    constructor(parameters = {}) {
        this.shader = parameters.shader;
        this.workgroupCount = parameters.workgroupCount ? parameters.workgroupCount : [1,1,1];
        this.resources = parameters.resources ? parameters.resources : {};
    }
}

class WebGPUComputer {
    constructor( parameters = {} ) {
        this._parameters = Object.assign( {}, parameters );
        //
        this._device = null;
        this._shaderSources = null;
        this._computePipelines = null;
        if(parameters.renderer) {
            this._device = parameters.renderer._device;
            this._shaderSources = parameters.renderer._shaderSources;
            this._bindGroupLayouts = parameters.renderer._bindGroupLayouts;
            this._computePipelines = new WebGPUComputePipelines( this._device, this._shaderSources, this._bindGroupLayouts);
            this._bindings = parameters.renderer._bindings;
            this._inialized_ = true;
        } else {
            this._parameters.requiredFeatures = ( parameters.requiredFeatures === undefined ) ? [] : parameters.requiredFeatures;
            this._parameters.requiredLimits = ( parameters.requiredLimits === undefined ) ? {} : parameters.requiredLimits;
            this._parameters.powerPreference = parameters.powerPreference ? parameters.powerPreference : 'high-performance';
        }
    }

    async init() {

        const parameters = this._parameters;

        const adapterOptions = {
            powerPreference: parameters.powerPreference
        };

        const adapter = await navigator.gpu.requestAdapter( adapterOptions );
        this._adapter = adapter;

        if ( adapter === null ) {

            throw new Error( 'WebGPURenderer: Unable to create WebGPU adapter.' );

        }

        if (adapter.features.has(GPUFeatureName.TextureCompressionAstc)) {
            parameters.requiredFeatures.push(GPUFeatureName.TextureCompressionAstc);
        }
        if (adapter.features.has(GPUFeatureName.TextureCompressionBC)) {
            parameters.requiredFeatures.push(GPUFeatureName.TextureCompressionBC);
        }
        if (adapter.features.has(GPUFeatureName.TextureCompressionEtc2)) {
            parameters.requiredFeatures.push(GPUFeatureName.TextureCompressionEtc2);
        }
        const deviceDescriptor = {
            requiredFeatures: parameters.requiredFeatures,
            requiredLimits: parameters.requiredLimits
        };

        const device = await adapter.requestDevice( deviceDescriptor );

        this._adapter = adapter;
        this._device = device;
        this._limits = this._device.limits;

        this._info = new WebGPUInfo();
        this._shaderSources = new WebGPUShaderSources();
        this._properties = new WebGPUProperties();
        this._bindGroupLayouts = new WebGPUBindGroupLayouts(device);
        this._attributes = new WebGPUAttributes( device );
        this._geometries = new WebGPUGeometries( this._attributes, this._info );
        this._textures = new WebGPUTextures( device, this._properties, this._info );
        this._objects = new WebGPUObjects( this._geometries, this._info );
        this._computePipelines = new WebGPUComputePipelines( this._device, this._shaderSources, this._bindGroupLayouts);
        this._bindings = new WebGPUBindings( device, this._info, this._properties, this._textures, this._attributes, this._shaderSources );
        //
        this._inialized_ = true;
    }

    compute( computeTasks, onCompute) {
        if(!this._inialized_) {
            return;
        }
        //
        const device = this._device;
        const cmdEncoder = device.createCommandEncoder( {} );
        const passEncoder = cmdEncoder.beginComputePass();
        let bufferNeedsMap = [];
        for ( let computeTask of computeTasks ) {

            // pipeline
            const computePipeline = this._computePipelines.get( computeTask );
            passEncoder.setPipeline( computePipeline.pipeline );

            const bindGroupLayouts = computePipeline.bindGroupLayouts.bindGroupLayouts;
            const bindGroups = computePipeline.shaderSource.bindingGroups;
            // set resource
            debugger
            computeTask.bindGroupLayouts = bindGroupLayouts;
            computeTask.bindGroups = [];

            for(let i=0, il = bindGroups.length; i<il; ++i)
            {
                if(bindGroups[i].filter === UniformFilter.CUSTOM) {
                    computeTask.bindGroups[i] = bindGroups[i].clone();
                } else {
                    computeTask.bindGroups[i] = bindGroups[i];
                }
                //
                const bindGroup = computeTask.bindGroups[i];
                for(let n=0, numBind = bindGroup.length; n<numBind; ++n)
                {
                    const binding = bindGroup[n];
                    if(binding.isUniformsGroup) {
                        binding.bindBufferToUniforms();
                        //
                        const uniforms = binding.uniforms;
                        for(let k=0, numUniform = uniforms.length; k<numUniform; ++k)
                        {
                            const uniform = uniforms[k];
                            if(computeTask.resources[uniform.name]) {
                                uniform.value = computeTask.resources[uniform.name];
                            }
                        }
                    } else if(binding.isStorageBuffer) {
                        const uniform = binding.uniform;
                        if(computeTask.resources[uniform.name]) {
                            const resource = computeTask.resources[uniform.name];
                            if(resource.buffer) {
                                if(resource.buffer.needsCreate) {
                                    resource.buffer.gpuBuffer = binding.createGPUBuffer(device, resource.buffer.size, resource.buffer.needsMap);
                                }
                                if(resource.buffer.needsMap) {
                                    bufferNeedsMap[bufferNeedsMap.length] = resource.buffer;
                                }
                            }
                        }
                    }
                }
            }

            // bind group
            for(let i=0, il = computeTask.bindGroups.length; i<il; ++i)
            {
                if(computeTask.bindGroups[i].filter === UniformFilter.CUSTOM) {
                    const uniformsData = this._bindings.get(null, computeTask.bindGroups[i], bindGroupLayouts[i]);
                    this._bindings.update( uniformsData, computePipeline.shaderSource.gpuTypesLayout, true);
                    passEncoder.setBindGroup( i, uniformsData.group );
                }
            }

            passEncoder.dispatchWorkgroups(
                computeTask.workgroupCount[0] ? computeTask.workgroupCount[0] : 1,
                computeTask.workgroupCount[1] ? computeTask.workgroupCount[1] : 1,
                computeTask.workgroupCount[2] ? computeTask.workgroupCount[2] : 1
            );
        }
        passEncoder.end();

        //
        for(let i=0, il = bufferNeedsMap.length; i<il; ++i)
        {
            bufferNeedsMap[i].gpuReadBuffer = device.createBuffer({
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                size: bufferNeedsMap[i].gpuBuffer.size
            });
            cmdEncoder.copyBufferToBuffer(bufferNeedsMap[i].gpuBuffer, 0, bufferNeedsMap[i].gpuReadBuffer, 0, bufferNeedsMap[i].gpuBuffer.size);
        }
        //
        device.queue.submit( [ cmdEncoder.finish() ] );
        //
        if(onCompute) {
            onCompute(computeTasks);
        }
    }

    dispose() {
        this._computePipelines.dispose();
    }
}

export {WebGPUComputeTask, WebGPUComputer};
