import {ShaderChunk} from "../shaders/WGSL/ShaderChunk";
import {WebGPUTypesLayout} from "./WebGPUTypesLayout";
import {WebGPUUniform} from "./WebGPUUniform";
import WebGPUUniformsGroup from "./WebGPUUniformsGroup";
import WebGPUSampler from "./WebGPUSampler";
import {WebGPUSampledTexture, WebGPUSampledArrayTexture, WebGPUSampled3DTexture, WebGPUSampledCubeTexture} from "./WebGPUSampledTexture";
import {
    GPUAccessMode,
    GPUBufferBindingType,
    GPUSamplerBindingType, GPUTextureSampleType,
    GPUTextureViewDimension

} from "./constants";

import {MathUtils} from "three";
import {UniformFilter} from "../shaders/UniformsLib";
import {assembleShaderSource} from "./WebGPUShaderSourceAssembler";
import WebGPUStorageBuffer from "./WebGPUStorageBuffer";


class WebGPUBindingGroup extends  Array {
    constructor(filter) {
        super();
        //
        this.filter = filter;
        //
        this.clone = ()=>{
            let res = new WebGPUBindingGroup(this.filter);
            for(let i=0, il = this.length; i<il; ++i) {
                res[i] = this[i].clone();
            }
            return res;
        }
        //
        let uniforms;
        this.getUniforms = ()=>{
            if(uniforms) {
                return  uniforms;
            }
            uniforms= {};
            //
            for(let i=0, il = this.length; i<il; ++i) {
                if(this[i].isUniformsGroup) {
                    const uniformGroup = this[i];
                    for( let n=0, nl = uniformGroup.uniforms.length; n<nl; ++n) {
                        uniforms[uniformGroup.uniforms[n].name] = uniformGroup.uniforms[n];
                    }
                } else if(!this[i].isStorageBuffer) {
                    uniforms[this[i].name] = this[i];
                }
            }
            //
            return uniforms;
        }
        //
        let storages;
        this.getStorages = ()=>{
            if(storages) {
                return storages;
            }
            storages = {};
            //
            for(let i=0, il = this.length; i<il; ++i) {
                if(this[i].isStorageBuffer) {
                    storages[this[i].name] = this[i];
                }
            }
            //
            return storages;
        }
    }
}
const CameraUniformsGroup = new WebGPUUniformsGroup('cameraUniforms', GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT, UniformFilter.CAMERA);
let CameraUniforms, SceneUniforms, SceneUniformsGroup;
class WebGPUShaderSource
{
    constructor(cacheKey, parameters, sceneId, updateSceneUniforms) {
        this.cacheKey = cacheKey;
        this.uuid = MathUtils.generateUUID();
        this.usedTimes = 0;
        this.gpuTypesLayout = new WebGPUTypesLayout();
        this.customStructs = [];
        this.attributes = [];
        this.uniforms = [];
        this.storages = [];
        this.bindingGroups = [];
        this.shaderResources = new Map();
        //
        CameraUniforms = WebGPUShaderSource.cameraUniforms.uniforms;
        this.updateSceneUniforms = false;
        if (!WebGPUShaderSource.sceneUniforms[sceneId] || updateSceneUniforms) {
            let sceneUniform = {
                uniformsGroup: new WebGPUUniformsGroup('sceneUniforms', GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, UniformFilter.SCENE),
                uniforms: {
                }
            };
            sceneUniform.uniformsGroup.shaderSource = this;
            sceneUniform.uniformsGroup.addUniform(WebGPUUniform.createUniform('fogDensity', 'f32'));
            sceneUniform.uniformsGroup.addUniform(WebGPUUniform.createUniform('fogNear', 'f32'));
            sceneUniform.uniformsGroup.addUniform(WebGPUUniform.createUniform('fogFar', 'f32'));
            sceneUniform.uniformsGroup.addUniform(WebGPUUniform.createUniform('fogColor', 'vec3<f32>'));
            sceneUniform.uniforms['fogDensity'] = sceneUniform.uniformsGroup.getUniform('fogDensity');
            sceneUniform.uniforms['fogNear'] = sceneUniform.uniformsGroup.getUniform('fogNear');
            sceneUniform.uniforms['fogFar'] = sceneUniform.uniformsGroup.getUniform('fogFar');
            sceneUniform.uniforms['fogColor'] = sceneUniform.uniformsGroup.getUniform('fogColor');

            sceneUniform.bindingGroup = new WebGPUBindingGroup(UniformFilter.SCENE);
            sceneUniform.bindingGroup[0] = sceneUniform.uniformsGroup;
            //
            WebGPUShaderSource.sceneUniforms[sceneId] = sceneUniform;
            //
            this.updateSceneUniforms = true;
        }
        SceneUniforms = WebGPUShaderSource.sceneUniforms[sceneId].uniforms;
        SceneUniformsGroup = WebGPUShaderSource.sceneUniforms[sceneId].uniformsGroup;
        //
        if(!parameters.isComputeShader) {
            this.vertexShader = parameters.vertexShader;
            this.fragmentShader = parameters.fragmentShader;
            this.vertexStageInAttributes = new Map();
            this.vertexStageOutAttributes = new Map();
            this.fragmentStageInAttributes = new Map();
            this.fragmentStageOutAttributes = new Map();
        } else {
            this.computeShader = parameters.shader;
            this.computeStageInAttributes = new Map();
            this.computeStageOutAttributes = new Map();
        }
        //
        assembleShaderSource(this, parameters);

        let shaderSource = this;

        function getStructures(shader) {
            let structs = [];
            shader = shader.replace(/struct[\s\n\r\t]*\w+[\s\n\r\t]*{([\s\S]+?)}[\s\n\r\t]*;?/g, function (match) {
                match = match.substring(0, match.lastIndexOf('}') + 1);
                match = match.replace(/;/g, ',');
                match = match.replace(/,\s*\t*\n*\r*}{1}/, '\n}');
                structs[structs.length] = match.trim();
                return '\n';
            });
            //
            for (let i = 0, ln = structs.length; i < ln; ++i) {
                let struct_name = structs[i].substring(7, structs[i].indexOf('{')).trim();
                if (shaderSource.gpuTypesLayout.hasLayout(struct_name)) {
                    continue;
                }
                //
                let members_ = structs[i].substring(structs[i].indexOf('{') + 1, structs[i].indexOf('}'));
                let members = members_.split(',');
                //let members = members_.split(';');
                const flag = shaderSource.gpuTypesLayout.addStructType(struct_name, members);
                //
                if (flag === 1) {
                    shaderSource.customStructs.push(structs[i]);
                }
            }
            //
            return shader;
        }

        let _cameraBindingIndex = 0;
        let _sceneBindingIndex = 0;
        let _mtlBindingIndex = 0;
        let _objBindingIndex = 0;
        let _customBindingIndex = [0,0,0,0];

        function getShaderIO(stage, shader) {
            shader = shader.replace(/(@group\(\d+\)[\s\t]*)?var[\s\t]*<[\s\t]*uniform[\s\t]*>[\s\t\n\r]*\w+[\s\t]*:[\s\t]*[^;]+;/g, function (match, p1) {
                const isGroupDefined = match.startsWith('@group');
                let group = -1;
                if(isGroupDefined) {
                    group = Number(p1.substring(p1.indexOf('(')+1, p1.indexOf(')')).trim());
                }
                const var_name = match.substring(match.indexOf('>') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                const typeLayout = shaderSource.gpuTypesLayout.getLayout(var_type);
                if (shaderSource.shaderResources.has(var_name)) {
                    shaderSource.shaderResources.get(var_name).visibility |= stage;
                } else {
                    const default_ = parameters.uniforms[var_name];

                    let uniformFilter = UniformFilter.OBJECT;
                    if(default_ && default_.filter) {
                        uniformFilter = default_.filter;
                    } else if(CameraUniforms && CameraUniforms[var_name]) {
                        uniformFilter = UniformFilter.CAMERA;
                    } else if(group > -1) {
                        uniformFilter = UniformFilter.CUSTOM;
                    }

                    const resource = {
                        name: var_name,
                        type: var_type,
                        visibility: stage,
                        binding: -1,
                        group: group,
                        isUniformBuffer: true,
                        defaultValue: default_ ? default_.value : undefined,
                        filter: uniformFilter
                    }
                    if (uniformFilter === UniformFilter.CAMERA) {
                        resource.binding = _cameraBindingIndex++;
                        shaderSource._needsCameraUniforms = true;
                    } else if (uniformFilter === UniformFilter.SCENE) {
                        resource.binding = _sceneBindingIndex++;
                        shaderSource._needsSceneUniforms = true;
                    } else if (uniformFilter === UniformFilter.MATERIAL) {
                        resource.binding = _mtlBindingIndex++;
                        shaderSource._needsMtlUniforms = true;
                    } else if (uniformFilter === UniformFilter.OBJECT) {
                        resource.binding = _objBindingIndex++;
                        shaderSource._needsObjUniforms = true;
                    } else if (uniformFilter === UniformFilter.CUSTOM) {
                        resource.binding = _customBindingIndex[group]++;
                        shaderSource._needsCustomUniforms = true;
                    }
                    //
                    shaderSource.shaderResources.set(var_name, resource);
                }
                //
                return '';
            });

            shader = shader.replace(/(@group\(\d+\)[\s\t]*)?var[\s\t]*<[\s\t]*storage[\s\S]*>[\s\t\n\r]*\w+[\s\t]*:[\s\t]*[^;]+;/g, function (match, p1) {
                const isGroupDefined = match.startsWith('@group');
                let group = -1;
                if(isGroupDefined) {
                    group = Number(p1.substring(p1.indexOf('(')+1, p1.indexOf(')')).trim());
                }
                let accessMode = GPUAccessMode.Read;
                const _p = match.indexOf(',');
                if(_p > 0) {
                    const access_mode = match.substring(_p + 1, match.indexOf('>')).trim();
                    if(access_mode === 'write') {
                        accessMode = GPUAccessMode.ReadWrite;
                    } else if(access_mode === 'read_write') {
                        accessMode = GPUAccessMode.ReadWrite;
                    }
                }
                const var_name = match.substring(match.indexOf('>') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                const typeLayout = shaderSource.gpuTypesLayout.getLayout(var_type);
                if (shaderSource.shaderResources.has(var_name)) {
                    shaderSource.shaderResources.get(var_name).visibility |= stage;
                } else {
                    const default_ = parameters.uniforms[var_name];

                    let uniformFilter = UniformFilter.OBJECT;
                    if(default_ && default_.filter) {
                        uniformFilter = default_.filter;
                    } else if(CameraUniforms && CameraUniforms[var_name]) {
                        uniformFilter = UniformFilter.CAMERA;
                    } else if(group > -1) {
                        uniformFilter = UniformFilter.CUSTOM;
                    }

                    const resource = {
                        name: var_name,
                        type: var_type,
                        visibility: stage,
                        binding: -1,
                        group: group,
                        isStorageBuffer: true,
                        accessMode: accessMode,
                        defaultValue: default_ ? default_.value : undefined,
                        filter: uniformFilter
                    }
                    if (uniformFilter === UniformFilter.CAMERA) {
                        resource.binding = _cameraBindingIndex++;
                        shaderSource._needsCameraUniforms = true;
                    } else if (uniformFilter === UniformFilter.SCENE) {
                        resource.binding = _sceneBindingIndex++;
                        shaderSource._needsSceneUniforms = true;
                    } else if (uniformFilter === UniformFilter.MATERIAL) {
                        resource.binding = _mtlBindingIndex++;
                        shaderSource._needsMtlUniforms = true;
                    } else if (uniformFilter === UniformFilter.OBJECT) {
                        resource.binding = _objBindingIndex++;
                        shaderSource._needsObjUniforms = true;
                    } else if (uniformFilter === UniformFilter.CUSTOM) {
                        resource.binding = _customBindingIndex[group]++;
                        shaderSource._needsCustomUniforms = true;
                    }
                    //
                    shaderSource.shaderResources.set(var_name, resource);
                }
                //
                return '@'+var_name + ' ' + match.substr(match.indexOf('var'));
            });

            shader = shader.replace(/(@group\(\d+\)[\s\t]*)?var[\s\t]+\w*:[\s\t\n\r]*(texture_\w+<\w+>)[\s\t]*;/g, function (match) {
                const isGroupDefined = match.startsWith('@group');
                let group = -1;
                if(isGroupDefined) {
                    group = Number(p1.substring(p1.indexOf('(')+1, p1.indexOf(')')).trim());
                }
                const var_name = match.substring(match.indexOf(' ') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                //
                if (shaderSource.shaderResources.has(var_name)) {
                    shaderSource.shaderResources.get(var_name).visibility |= stage;
                } else {
                    const default_ = parameters.uniforms[var_name];
                    let uniformFilter = UniformFilter.OBJECT;
                    if(default_ && default_.filter) {
                        uniformFilter = default_.filter;
                    } else if(CameraUniforms && CameraUniforms[var_name]) {
                        uniformFilter = UniformFilter.CAMERA;
                    } else if(group > -1) {
                        uniformFilter = UniformFilter.CUSTOM;
                    }
                    let resource = {
                        name: var_name,
                        type: var_type,
                        visibility: stage,
                        binding: -1,
                        group: group,
                        filter: uniformFilter
                    };
                    if (uniformFilter === UniformFilter.CAMERA) {
                        resource.binding = _cameraBindingIndex++;
                    } else if (uniformFilter === UniformFilter.SCENE) {
                        resource.binding = _sceneBindingIndex++;
                    } else if (uniformFilter === UniformFilter.MATERIAL) {
                        resource.binding = _mtlBindingIndex++;
                    } else if (uniformFilter === UniformFilter.OBJECT) {
                        resource.binding = _objBindingIndex++;
                    } else if (uniformFilter === UniformFilter.CUSTOM) {
                        resource.binding = _customBindingIndex[group]++;
                        shaderSource._needsCustomUniforms = true;
                    }

                    resource.isTexture = true;
                    //
                    shaderSource.shaderResources.set(var_name, resource);
                }
                //
                return '';
            });

            shader = shader.replace(/var[\s\t]+\w*:[\s\t\n\r]*sampler[\s\t]*;/g, function (match) {
                const isGroupDefined = match.startsWith('@group');
                let group = -1;
                if(isGroupDefined) {
                    group = Number(p1.substring(p1.indexOf('(')+1, p1.indexOf(')')).trim());
                }
                const var_name = match.substring(match.indexOf(' ') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                //
                if (shaderSource.shaderResources.has(var_name)) {
                    shaderSource.shaderResources.get(var_name).visibility |= stage;
                } else {
                    let textureName = var_name.substring(0, var_name.lastIndexOf('S'));
                    const  uniformFilter = shaderSource.shaderResources.get(textureName).filter;
                    let resource = {
                        name: var_name,
                        type: var_type,
                        visibility: stage,
                        binding: -1,
                        group: group,
                        filter: uniformFilter
                    };
                    if (uniformFilter === UniformFilter.CAMERA) {
                        resource.binding = _cameraBindingIndex++;
                    } else if (uniformFilter === UniformFilter.SCENE) {
                        resource.binding = _sceneBindingIndex++;
                    } else if (uniformFilter === UniformFilter.MATERIAL) {
                        resource.binding = _mtlBindingIndex++;
                    } else if (uniformFilter === UniformFilter.OBJECT) {
                        resource.binding = _objBindingIndex++;
                    } else if (uniformFilter === UniformFilter.CUSTOM) {
                        resource.binding = _customBindingIndex[group]++;
                        shaderSource._needsCustomUniforms = true;
                    }
                    if (var_type === 'sampler') {
                        resource.isSampler = true;
                    } else {
                        resource.isTexture = true;
                    }
                    //
                    shaderSource.shaderResources.set(var_name, resource);
                }
                //
                return '';
            });

            let in_location = 0;
            shader = shader.replace(/var[\s\t]*<[\s\t]*in[\s\t]*>[\s\t\n\r]*\w+[\s\t]*:[\s\t]*[^;]+;/g, function (match) {
                const var_name = match.substring(match.indexOf('>') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                if (stage === GPUShaderStage.VERTEX) {
                    shaderSource.attributes[in_location] = {name: var_name, type: var_type, location: in_location};
                    shaderSource.vertexStageInAttributes.set(var_name, {
                        name: var_name,
                        type: var_type,
                        location: in_location++
                    });
                } else if (stage === GPUShaderStage.FRAGMENT) {
                    if (shaderSource.vertexStageOutAttributes.has(var_name)) {
                        shaderSource.fragmentStageInAttributes.set(var_name,
                            {
                                name: var_name,
                                type: var_type,
                                location: shaderSource.vertexStageOutAttributes.get(var_name).location
                            });
                    }
                }
                return '';
            });
            //buildin
            if (stage === GPUShaderStage.VERTEX) {
                let shaderMainBodyStart = shader.indexOf('@vertex');
                shaderMainBodyStart = shader.indexOf('fn', shaderMainBodyStart);
                let shaderParamStart = shader.indexOf('(', shaderMainBodyStart);
                shaderMainBodyStart = shader.indexOf('{', shaderMainBodyStart);
                let shaderParam = shader.substring(shaderParamStart + 1, shaderMainBodyStart).trim();
                shaderParam = shaderParam.substr(0, shaderParam.length-1).trim();
                let inputBuiltinValues = WebGPUShaderSource.vertexInputBuiltinValues;
                if(shaderParam !== "") {
                    let params = shaderParam.split(',');
                    if(params.length === 1) {
                        inputBuiltinValues = [];
                    } else {

                    }
                }
                let shaderMainBody = shader.substring(shaderMainBodyStart, shader.lastIndexOf('}') + 1);
                for (let i = 0, ln = inputBuiltinValues.length; i < ln; ++i) {
                    const valueName = inputBuiltinValues[i];
                    const valueType = WebGPUShaderSource.builtinValueType[valueName];
                    const re = new RegExp('[^\\w\.]{1}' + valueName + '[^\\w]{1}', 'g');
                    shaderMainBody.replace(re, () => {
                        if (!shaderSource.vertexStageInAttributes.has(valueName)) {
                            shaderSource.vertexStageInAttributes.set(valueName, {
                                name: valueName,
                                type: valueType,
                                location: 'builtin(' + valueName + ')',
                                isBuiltin: true
                            });
                        }
                    });
                }
                //
                const outputBuiltinValues = WebGPUShaderSource.vertexOutputBuiltinValues;
                for (let i = 0, ln = outputBuiltinValues.length; i < ln; ++i) {
                    const valueName = outputBuiltinValues[i];
                    const valueType = WebGPUShaderSource.builtinValueType[valueName];
                    const re = new RegExp('[^\\w\.]{1}' + valueName + '[^\\w]{1}', 'g');
                    shaderMainBody.replace(re, () => {
                        if (!shaderSource.vertexStageOutAttributes.has(valueName)) {
                            shaderSource.vertexStageOutAttributes.set(valueName, {
                                name: valueName,
                                type: valueType,
                                location: 'builtin(' + valueName + ')',
                                isBuiltin: true
                            });
                        }
                    });
                }
                //
                shader = shader.replace(/wgl_position/g, function (match) {
                    if (!shaderSource.vertexStageOutAttributes.has('position')) {
                        shaderSource.vertexStageOutAttributes.set('position', {
                            name: 'position',
                            type: 'vec4<f32>',
                            location: 'builtin(position)',
                            isBuiltin: true
                        });
                    }
                    return 'vertexOut.position';
                });
            } else if (stage === GPUShaderStage.FRAGMENT) {
                let shaderMainBodyStart = shader.indexOf('@fragment');
                shaderMainBodyStart = shader.indexOf('{', shaderMainBodyStart);
                let shaderMainBody = shader.substring(shaderMainBodyStart, shader.lastIndexOf('}') + 1);
                const inputBuiltinValues = WebGPUShaderSource.fragmentInputBuiltinValues;
                for (let i = 0, ln = inputBuiltinValues.length; i < ln; ++i) {
                    const valueName = inputBuiltinValues[i];
                    const valueType = WebGPUShaderSource.builtinValueType[valueName];
                    const re = new RegExp('[^\\w\.]{1}' + valueName + '[^\\w]{1}', 'g');
                    shaderMainBody.replace(re, () => {
                        if (!shaderSource.fragmentStageInAttributes.has(valueName)) {
                            shaderSource.fragmentStageInAttributes.set(valueName, {
                                name: valueName,
                                type: valueType,
                                location: 'builtin(' + valueName + ')',
                                isBuiltin: true
                            });
                        }
                    });
                }
                //
                const outputBuiltinValues = WebGPUShaderSource.fragmentOutputBuiltinValues;
                for (let i = 0, ln = outputBuiltinValues.length; i < ln; ++i) {
                    const valueName = outputBuiltinValues[i];
                    const valueType = WebGPUShaderSource.builtinValueType[valueName];
                    const re = new RegExp('[^\\w\.]{1}' + valueName + '[^\\w]{1}', 'g');
                    shaderMainBody.replace(re, () => {
                        if (!shaderSource.fragmentStageOutAttributes.has(valueName)) {
                            shaderSource.fragmentStageOutAttributes.set(valueName, {
                                name: valueName,
                                type: valueType,
                                location: 'builtin(' + valueName + ')',
                                isBuiltin: true
                            });
                        }
                    });
                }
            } else if (stage === GPUShaderStage.COMPUTE) {

            }

            let out_location = 0;
            shader = shader.replace(/frag_color/g, function (match) {
                if (!shaderSource.fragmentStageOutAttributes.has('fragColor')) {
                    shaderSource.fragmentStageOutAttributes.set('fragColor', {
                        name: 'fragColor',
                        type: 'vec4<f32>',
                        location: 'location(' + out_location++ + ')',
                        isBuiltin: true
                    });
                }
                return 'fragmentOut.fragColor';
            });
            shader = shader.replace(/var[\s\t]*<[\s\t]*out[\s\t]*>[\s\t\n\r]*\w+[\s\t]*:[\s\t]*[^;]+;/g, function (match) {
                const var_name = match.substring(match.indexOf('>') + 1, match.indexOf(':')).trim();
                const var_type = match.substring(match.indexOf(':') + 1, match.indexOf(';')).trim();
                if (stage === GPUShaderStage.VERTEX) {
                    shaderSource.vertexStageOutAttributes.set(var_name, {
                        name: var_name,
                        type: var_type,
                        location: out_location++
                    });
                } else if (stage === GPUShaderStage.FRAGMENT) {
                    shaderSource.fragmentStageOutAttributes.set(var_name, {
                        name: var_name,
                        type: var_type,
                        location: out_location++
                    });
                }
                return '';
            });
            //
            return shader;
        }

        //
        function bindShaderIO(stage, shader) {
            let inStructRegexp = stage === "vertex" ? /@VertexInStruct/g : /@FragmentInStruct/g;
            let inStructName = stage === "vertex" ? "VertexIn" : "FragmentIn";
            let inAttributes = stage === "vertex" ? shaderSource.vertexStageInAttributes : shaderSource.fragmentStageInAttributes;
            if (inAttributes.size > 0) {
                shader = shader.replace(inStructRegexp, function (match) {
                    let inStruct = 'struct ' + inStructName + ' {\n';
                    inAttributes.forEach((value, key, map) => {
                        if (value.isBuiltin) {
                            inStruct += "@" + value.location + " " + value.name + ":" + value.type + ",\n";
                        } else {
                            inStruct += "@location(" + value.location + ") " + value.name + ":" + value.type + ",\n";
                        }
                    });
                    inStruct += '}';
                    //
                    return inStruct;
                });
            } else {
                shader = shader.replace(inStructRegexp, function (match) {
                    return '';
                });
                inStructName = '';
            }
            //
            let outStructRegexp = stage === "vertex" ? /@VertexOutStruct/g : /@FragmentOutStruct/g;
            let outStructName = stage === "vertex" ? "VertexOut" : "FragmentOut";
            let outAttributes = stage === "vertex" ? shaderSource.vertexStageOutAttributes : shaderSource.fragmentStageOutAttributes;
            if (outAttributes.size > 0) {
                shader = shader.replace(outStructRegexp, function (match) {
                    let outStruct = 'struct ' + outStructName + ' {\n';
                    outAttributes.forEach((value, key, map) => {
                        if (value.isBuiltin) {
                            outStruct += "@" + value.location + " " + value.name + ":" + value.type + ",\n";
                        } else {
                            outStruct += "@location(" + value.location + ") " + value.name + ":" + value.type + ",\n";
                        }
                    });
                    outStruct += '}';
                    //
                    return outStruct;
                });
            } else {
                outStructName = '';
                return '';
            }

            //
            let stageFlag = stage === "vertex" ? '@vertex' : '@fragment';
            let fnEnd = 0;
            let fnStartIndex = shader.indexOf(stageFlag);
            let fnEndIndex = fnStartIndex;
            while (fnEnd > -1) {
                if (shader[fnEndIndex] === '{') {
                    fnEnd += 1;
                } else if (shader[fnEndIndex] === '}') {
                    fnEnd -= 1;
                    if (fnEnd === 0)
                        fnEnd = -1;
                }
                //
                fnEndIndex++;
            }
            shader = shader.substring(0, fnEndIndex) + "#" + shader.substring(fnEndIndex);
            let fnRegexp = stage === "vertex" ? /@vertex[^#]*#/g : /@fragment[^#]*#/g;
            shader = shader.replace(fnRegexp, function (match) {
                const inPrefix = stage === "vertex" ? 'vertexIn.' : 'fragmentIn.';
                inAttributes.forEach((value, key, map) => {
                    const re = new RegExp('[^\\w\.]{1}' + value.name + '[^\\w]{1}', 'g');
                    match = match.replace(re, function (match_) {
                        return match_[0] + inPrefix + match_.substring(1);
                    });
                });
                const outPrefix = stage === "vertex" ? 'vertexOut.' : 'fragmentOut.';
                outAttributes.forEach((value, key, map) => {
                    const re = new RegExp('[^\\w\.]{1}' + value.name + '[^\\w]{1}', 'g');
                    match = match.replace(re, function (match_) {
                        return match_[0] + outPrefix + match_.substring(1);
                    });
                });
                //
                let paramStart = match.indexOf('(', stage === 'vertex' ? 14 : 16);
                let paramEnd = match.indexOf('{', paramStart);
                let paramName = stage === 'vertex' ? 'vertexIn' : 'fragmentIn';
                let outParamName = stage === 'vertex' ? 'vertexOut' : 'fragmentOut';
                let res = match;
                if (inStructName === '') {
                    res = match.substring(0, paramStart + 1) + ')';
                } else {
                    res = match.substring(0, paramStart + 1) + paramName + ':' + inStructName + ')';
                }
                if (outStructName === '') {
                    res += match.substring(paramEnd + 1, match.length - 2) + ';\n}';
                } else {
                    res += '->' + outStructName + '{ var ' + outParamName + ':' + outStructName + ';\n' + match.substring(paramEnd + 1, match.length - 2) + 'return ' + outParamName + ';\n}';
                }
                //
                return res;
            });
            //
            return shader;
        }
        //
        if(!parameters.isComputeShader) {
            this.vertexShader = this.vertexShader.replace(/@binding(\d)[\s\t\n]*/g, '');
            this.fragmentShader = this.fragmentShader.replace(/@binding(\d)[\s\t\n]*/g, '');
            this.vertexShader = getStructures(this.vertexShader);
            this.fragmentShader = getStructures(this.fragmentShader);
        } else {
            this.computeShader = this.computeShader.replace(/@binding\(\d+\)[\s\t\n]*/g, '');
            this.computeShader = getStructures(this.computeShader);
        }
        //
        let customStructDefines = '';
        for (let i = 0, numStruct = this.customStructs.length; i < numStruct; ++i) {
            customStructDefines += this.customStructs[i] + ';\n';
        }
        if(!parameters.isComputeShader) {
            this.vertexShader = this.vertexShader.replace(/@CustomStructs/, customStructDefines);
            this.fragmentShader = this.fragmentShader.replace(/@CustomStructs/, customStructDefines);
            //
            this.vertexShader = getShaderIO(GPUShaderStage.VERTEX, this.vertexShader);
            this.fragmentShader = getShaderIO(GPUShaderStage.FRAGMENT, this.fragmentShader);
            //
            this.vertexShader = bindShaderIO("vertex", this.vertexShader);
            this.fragmentShader = bindShaderIO("fragment", this.fragmentShader);

            this.vertexShader = this.vertexShader.replace(/[\n]+(\s*\t*\n)+/g, '\n');
            this.fragmentShader = this.fragmentShader.replace(/[\n]+(\s*\t*\n)+/g, '\n');
        } else {
            this.computeShader = this.computeShader.replace(/@CustomStructs/, customStructDefines);
            //
            this.computeShader = getShaderIO(GPUShaderStage.COMPUTE, this.computeShader);
            //
            this.computeShader = this.computeShader.replace(/[\n]+(\s*\t*\n)+/g, '\n');
        }
        //
        let groupIndex = 0;
        const cameraBindingGroup = {
            uniforms: {},
            storages: [],
            textures: [],
            samplers: [],
            uniformVisibility: 0,
            layoutEntry: new Map(),
            groupIndex: this._needsCameraUniforms ? groupIndex++ : -1
        };
        const sceneBindingGroup = {
            uniforms: {},
            storages: [],
            textures: [],
            samplers: [],
            uniformVisibility: 0,
            layoutEntry: new Map(),
            groupIndex: this._needsSceneUniforms ? groupIndex++ : -1
        };
        const mtlBindingGroup = {
            uniforms: {},
            storages: [],
            textures: [],
            samplers: [],
            uniformVisibility: 0,
            layoutEntry: new Map(),
            groupIndex: this._needsMtlUniforms ? groupIndex++ : -1
        };
        const objBindingGroup = {
            uniforms: {},
            storages: [],
            textures: [],
            samplers: [],
            uniformVisibility: 0,
            layoutEntry: new Map(),
            groupIndex: this._needsObjUniforms ? groupIndex++ : -1
        };
        const customBindingGroup = [
            {
                uniforms: {},
                storages: [],
                textures: [],
                samplers: [],
                uniformVisibility: 0,
                layoutEntry: new Map(),
                groupIndex: this._needsCustomUniforms ? groupIndex++ : -1
            },
            {
                uniforms: {},
                storages: [],
                textures: [],
                samplers: [],
                uniformVisibility: 0,
                layoutEntry: new Map(),
                groupIndex: this._needsCustomUniforms ? groupIndex++ : -1
            },
            {
                uniforms: {},
                storages: [],
                textures: [],
                samplers: [],
                uniformVisibility: 0,
                layoutEntry: new Map(),
                groupIndex: this._needsCustomUniforms ? groupIndex++ : -1
            },
            {
                uniforms: {},
                storages: [],
                textures: [],
                samplers: [],
                uniformVisibility: 0,
                layoutEntry: new Map(),
                groupIndex: this._needsCustomUniforms ? groupIndex++ : -1
            }
        ];

        let mtlUniformsGroup = new WebGPUUniformsGroup('mtlUniform', 0, UniformFilter.MATERIAL);
        let objUniformsGroup = new WebGPUUniformsGroup('objUniform', 0, UniformFilter.OBJECT);
        let customUniformsGroup = [
            new WebGPUUniformsGroup('customUniform0', 0, UniformFilter.CUSTOM),
            new WebGPUUniformsGroup('customUniform1', 0, UniformFilter.CUSTOM),
            new WebGPUUniformsGroup('customUniform2', 0, UniformFilter.CUSTOM),
            new WebGPUUniformsGroup('customUniform3', 0, UniformFilter.CUSTOM)
        ];

        let getSampleType = (textureType) => {
            if (textureType.indexOf('f32') > 0) {
                return GPUTextureSampleType.Float;
            } else if (textureType.indexOf('i32') > 0) {
                return GPUTextureSampleType.Sint;
            } else if (textureType.indexOf('u32') > 0) {
                return GPUTextureSampleType.Uint;
            }
        }

        let uniforms_ = new Map();
        let createBinding = (value, bindingGroup, updateBinding) => {
            const bindGroupLayoutEntry = bindingGroup.layoutEntry;
            const groupedUniform = bindingGroup.uniforms;
            const storages = bindingGroup.storages;
            const textures = bindingGroup.textures;
            const samplers = bindingGroup.samplers;
            const visibility = value.visibility;
            //
            value.group = bindingGroup.groupIndex;
            //
            if (value.type.startsWith('texture_2d')) {
                if (updateBinding) {
                    groupedUniform[value.name] = new WebGPUSampledTexture(value.name, parameters.uniforms[value.name].value, value.binding, value.group);
                    textures[textures.length] = groupedUniform[value.name];
                    bindGroupLayoutEntry.set(value.name, {
                        binding: value.binding,
                        visibility: visibility,
                        texture: {
                            sampleType: getSampleType(value.type),
                            viewDimension: GPUTextureViewDimension.TwoD,
                            multisampled: false
                        }
                    });
                } else {
                    textures[textures.length] = {name: value.name};
                }
            } else if (value.type.startsWith('texture_2d_array')) {
                if (updateBinding) {
                    groupedUniform[value.name] = new WebGPUSampledArrayTexture(value.name, parameters.uniforms[value.name].value, value.binding, value.group);
                    textures[textures.length] = groupedUniform[value.name];
                    bindGroupLayoutEntry.set(value.name, {
                        binding: value.binding,
                        visibility: visibility,
                        texture: {
                            sampleType: getSampleType(value.type),
                            viewDimension: GPUTextureViewDimension.TwoDArray,
                            multisampled: false
                        }
                    });
                } else {
                    textures[textures.length] = {name: value.name};
                }

            } else if (value.type.startsWith('texture_3d')) {
                if (updateBinding) {
                    groupedUniform[value.name] = new WebGPUSampled3DTexture(value.name, parameters.uniforms[value.name].value, value.binding, value.group);
                    textures[textures.length] = groupedUniform[value.name];
                    bindGroupLayoutEntry.set(value.name, {
                        binding: value.binding,
                        visibility: visibility,
                        texture: {
                            sampleType: getSampleType(value.type),
                            viewDimension: GPUTextureViewDimension.ThreeD,
                            multisampled: false
                        }
                    });
                } else {
                    textures[textures.length] = {name: value.name};
                }
            } else if (value.type.startsWith('texture_cube')) {
                if (updateBinding) {
                    groupedUniform[value.name] = new WebGPUSampledCubeTexture(value.name, parameters.uniforms[value.name].value, value.binding, value.group);
                    textures[textures.length] = groupedUniform[value.name];
                    bindGroupLayoutEntry.set(value.name, {
                        binding: value.binding,
                        visibility: visibility,
                        texture: {
                            sampleType: getSampleType(value.type),
                            viewDimension: GPUTextureViewDimension.Cube,
                            multisampled: false
                        }
                    });
                } else {
                    textures[textures.length] = {name: value.name};
                }

            } else if (value.type.startsWith('sampler')) {
                if (updateBinding) {
                    let textureName = value.name.substring(0, value.name.lastIndexOf('S'));
                    groupedUniform[value.name] = new WebGPUSampler(value.name, parameters.uniforms[textureName].value, value.binding, value.group);
                    samplers[samplers.length] = groupedUniform[value.name];
                    bindGroupLayoutEntry.set(value.name, {
                        binding: value.binding,
                        visibility: visibility,
                        sampler: {
                            type: GPUSamplerBindingType.Filtering
                        }
                    })
                } else {
                    samplers[samplers.length] = {name: value.name};
                }
            } else if(value.isUniformBuffer) {
                let uniform_;
                if (updateBinding) {
                    const layout = this.gpuTypesLayout.getLayout(value.type);
                    //
                    if (layout.isStruct) {
                        uniform_ = WebGPUUniform.createUniform(value.name, {
                            isStruct: true,
                            typeName: value.type,
                            layout: layout
                        }, value.defaultValue, value.binding, value.group);
                    } else if (layout.isArray) {
                        uniform_ = WebGPUUniform.createUniform(value.name, {
                            isArray: true,
                            typeName: value.type,
                            layout: layout
                        }, value.defaultValue, value.binding, value.group);
                    } else {
                        uniform_ = WebGPUUniform.createUniform(value.name, value.type, value.defaultValue, value.binding, value.group);
                    }
                    //
                    if (value.filter === UniformFilter.SCENE) {
                        SceneUniforms[value.name] = uniform_;
                        SceneUniformsGroup.addUniform(uniform_);
                    }
                    if (value.filter === UniformFilter.MATERIAL) {
                        groupedUniform[value.name] = uniform_;
                        mtlUniformsGroup.addUniform(uniform_);
                        mtlUniformsGroup.visibility |= visibility;
                    } else if (value.filter === UniformFilter.OBJECT) {
                        groupedUniform[value.name] = uniform_;
                        objUniformsGroup.addUniform(uniform_);
                        objUniformsGroup.visibility |= visibility;
                    } else if (value.filter === UniformFilter.CUSTOM) {
                        groupedUniform[value.name] = uniform_;
                        customUniformsGroup[value.group].addUniform(uniform_);
                        customUniformsGroup[value.group].visibility |= visibility;
                    }
                }
                //
                if (value.filter === UniformFilter.CAMERA) {
                    cameraBindingGroup.uniformVisibility |= visibility;
                } else if (value.filter === UniformFilter.SCENE) {
                    sceneBindingGroup.uniformVisibility |= visibility;
                }
                //
                uniforms_.set(value.name, {filter: value.filter, visibility: visibility, group: value.group});
            } else if(value.isStorageBuffer) {
                let _uniform;
                if (updateBinding) {
                    const layout = this.gpuTypesLayout.getLayout(value.type);
                    //
                    if (layout.isStruct) {
                        _uniform = WebGPUUniform.createUniform(value.name, {
                            isStruct: true,
                            typeName: value.type,
                            layout: layout
                        }, value.defaultValue, value.binding, value.group);
                    } else if (layout.isArray) {
                        _uniform = WebGPUUniform.createUniform(value.name, {
                            isArray: true,
                            typeName: value.type,
                            layout: layout
                        }, value.defaultValue, value.binding, value.group);
                    } else {
                        _uniform = WebGPUUniform.createUniform(value.name, value.type, value.defaultValue, value.binding, value.group);
                    }
                }

                let storageBuffer = new WebGPUStorageBuffer(value.name, visibility, value.filter, value.accessMode, {
                    uniform: _uniform
                })

                storages.push(storageBuffer);
            }
        }

        this.shaderResources.forEach((value, key, map) => {
            if (value.filter === UniformFilter.CAMERA) {
                createBinding(value, cameraBindingGroup, false);
            } else if (value.filter === UniformFilter.SCENE) {
                createBinding(value, sceneBindingGroup, this.updateSceneUniforms);
            } else if (value.filter === UniformFilter.MATERIAL) {
                createBinding(value, mtlBindingGroup, true);
            } else if (value.filter === UniformFilter.OBJECT) {
                createBinding(value, objBindingGroup, true);
            } else if (value.filter === UniformFilter.CUSTOM) {
                createBinding(value, customBindingGroup[value.group], true);
            }
        });
        //
        if (CameraUniforms && !CameraUniformsGroup.mergedUniform) {
            CameraUniformsGroup.merge();
        }
        if (SceneUniforms && !SceneUniformsGroup.mergedUniform) {
            SceneUniformsGroup.merge();
        }
        if(mtlUniformsGroup.uniforms.length > 0) {
            mtlUniformsGroup.merge();
        }
        if(objUniformsGroup.uniforms.length > 0) {
            objUniformsGroup.merge();
        }
        for(let i=0; i<4; ++i)
        {
            if(customUniformsGroup[i].uniforms.length > 0) {
                customUniformsGroup[i].merge();
            }
        }

        if (this.updateSceneUniforms) {
            if (SceneUniformsGroup.uniforms.length > 0) {
                sceneBindingGroup.layoutEntry.set(SceneUniformsGroup.mergedUniform.name, {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: GPUBufferBindingType.Unifrom,
                        hasDynamicOffset: false,
                        minBindingSize: 0
                    }
                });
            }
            //
            WebGPUShaderSource.sceneUniforms[sceneId].layoutEntry = sceneBindingGroup.layoutEntry;
        }
        //
        if (cameraBindingGroup.groupIndex > -1) {
            this.uniforms[cameraBindingGroup.groupIndex] = CameraUniforms;
            if(cameraBindingGroup.storages.length > 0) {
                this.storages[cameraBindingGroup.groupIndex] = cameraBindingGroup.storages;
            }

        }
        if (sceneBindingGroup.groupIndex > -1) {
            this.uniforms[sceneBindingGroup.groupIndex] = SceneUniforms;
            if(sceneBindingGroup.storages.length > 0) {
                this.storages[sceneBindingGroup.groupIndex] = sceneBindingGroup.storages;
            }
        }
        if (mtlUniformsGroup.uniforms.length > 0) {
            mtlBindingGroup.layoutEntry.set(mtlUniformsGroup.mergedUniform.name, {
                binding: 0,
                visibility: mtlUniformsGroup.visibility,
                buffer: {
                    type: GPUBufferBindingType.Unifrom,
                    hasDynamicOffset: false,
                    minBindingSize: 0
                }
            });
            //
            this.uniforms[mtlBindingGroup.groupIndex] = mtlBindingGroup.uniforms;
        }
        if(mtlBindingGroup.storages.length > 0) {
            this.storages[mtlBindingGroup.groupIndex] = [];
            for(let i=0, il = mtlBindingGroup.storages.length; i<il; ++i)
            {
                mtlBindingGroup.layoutEntry.set(mtlBindingGroup.storages[i].name, {
                    binding: mtlBindingGroup.storages[i].binding,
                    visibility: mtlBindingGroup.storages[i].visibility,
                    buffer: {
                        type: GPUBufferBindingType.Storage,
                        hasDynamicOffset: false,
                        minBindingSize: 0
                    }
                });
                //
                this.storages[mtlBindingGroup.groupIndex].push(mtlBindingGroup.storages[i]);
            }
        }

        if (objUniformsGroup.uniforms.length > 0) {
            objBindingGroup.layoutEntry.set(objUniformsGroup.mergedUniform.name, {
                binding: 0,
                visibility: objUniformsGroup.visibility,
                buffer: {
                    type: GPUBufferBindingType.Unifrom,
                    hasDynamicOffset: false,
                    minBindingSize: 0
                }
            });
            //
            this.uniforms[objBindingGroup.groupIndex] = objBindingGroup.uniforms;
        }
        if(objBindingGroup.storages.length > 0) {
            this.storages[objBindingGroup.groupIndex] = [];
            for(let i=0, il = objBindingGroup.storages.length; i<il; ++i)
            {
                objBindingGroup.layoutEntry.set(objBindingGroup.storages[i].name, {
                    binding: objBindingGroup.storages[i].binding,
                    visibility: objBindingGroup.storages[i].visibility,
                    buffer: {
                        type: GPUBufferBindingType.Storage,
                        hasDynamicOffset: false,
                        minBindingSize: 0
                    }
                });
                //
                this.storages[objBindingGroup.groupIndex].push(objBindingGroup.storages[i]);
            }
        }

        for(let i=0; i<4; ++i)
        {
            if(customUniformsGroup[i].uniforms.length > 0) {
                customBindingGroup[i].layoutEntry.set(customUniformsGroup[i].mergedUniform.name, {
                    binding: 0,
                    visibility: customUniformsGroup[i].visibility,
                    buffer: {
                        type: GPUBufferBindingType.Unifrom,
                        hasDynamicOffset: false,
                        minBindingSize: 0
                    }
                });
                //
                this.uniforms[customBindingGroup[i].groupIndex] = customBindingGroup[i].uniforms;
            }
            if(customBindingGroup[i].storages.length > 0) {
                this.storages[customBindingGroup[i].groupIndex] = [];
                for(let j=0, jl = customBindingGroup[i].storages.length; j<jl; ++j)
                {
                    customBindingGroup[i].layoutEntry.set(customBindingGroup[i].storages[j].name, {
                        binding: customBindingGroup[i].storages[j].binding,
                        visibility: customBindingGroup[i].storages[j].visibility,
                        buffer: {
                            type: GPUBufferBindingType.Storage,
                            hasDynamicOffset: false,
                            minBindingSize: 0
                        }
                    });
                    //
                    this.storages[customBindingGroup[i].groupIndex].push(customBindingGroup[i].storages[j]);
                }
            }
        }
        //
        let vertexMainBodyStart, vertexMainBody, fragmentMainBodyStart, fragmentMainBody, computeMainBodyStart, computeMainBody;
        if(!this.computeShader) {
            vertexMainBodyStart = this.vertexShader.indexOf('@vertex');
            vertexMainBodyStart = this.vertexShader.indexOf('{', vertexMainBodyStart);
            vertexMainBody = this.vertexShader.substring(vertexMainBodyStart, this.vertexShader.lastIndexOf('}') + 1);
            fragmentMainBodyStart = this.fragmentShader.indexOf('@fragment');
            fragmentMainBodyStart = this.fragmentShader.indexOf('{', fragmentMainBodyStart);
            fragmentMainBody = this.fragmentShader.substring(fragmentMainBodyStart, this.fragmentShader.lastIndexOf('}') + 1);
        } else {
            computeMainBodyStart = this.computeShader.indexOf('@compute');
            computeMainBodyStart = this.computeShader.indexOf('{', computeMainBodyStart);
            computeMainBody = this.computeShader.substring(computeMainBodyStart, this.computeShader.lastIndexOf('}') + 1);
        }

        uniforms_.forEach((value, key, map) => {
            const uniformName = key;
            let prefix;
            if (value.filter === UniformFilter.CAMERA) {
                if(CameraUniformsGroup.mergedUniform.name === CameraUniformsGroup.name) {
                    prefix = CameraUniformsGroup.mergedUniform.name + '.';
                }
            } else if (value.filter === UniformFilter.SCENE) {
                if(SceneUniformsGroup.mergedUniform.name === SceneUniformsGroup.name) {
                    prefix = SceneUniformsGroup.mergedUniform.name + '.';
                }
            } else if (value.filter === UniformFilter.MATERIAL) {
                if(mtlUniformsGroup.mergedUniform.name === mtlUniformsGroup.name) {
                    prefix = mtlUniformsGroup.mergedUniform.name + '.';
                }
            } else if (value.filter === UniformFilter.OBJECT) {
                if(objUniformsGroup.mergedUniform.name === objUniformsGroup.name) {
                    prefix = objUniformsGroup.mergedUniform.name + '.';
                }
            } else if (value.filter === UniformFilter.CUSTOM) {
                if(customUniformsGroup[value.group].mergedUniform.name === customUniformsGroup[value.group].name) {
                    prefix = customUniformsGroup[value.group].mergedUniform.name + '.';
                }
            }

            if(prefix) {
                const re = new RegExp('[^\\w\.]{1}' + uniformName + '[\\W]{1}', 'g');

                if (this.shaderResources.has(uniformName)) {
                    if (value.visibility & GPUShaderStage.VERTEX) {
                        vertexMainBody = vertexMainBody.replace(re, function (match_) {
                            return match_[0] + prefix + match_.substring(1);
                        });
                    }
                    if (value.visibility & GPUShaderStage.FRAGMENT) {
                        fragmentMainBody = fragmentMainBody.replace(re, function (match_) {
                            return match_[0] + prefix + match_.substring(1);
                        });
                    }
                    if (value.visibility & GPUShaderStage.COMPUTE) {
                        computeMainBody = computeMainBody.replace(re, function (match_) {
                            return match_[0] + prefix + match_.substring(1);
                        });
                    }
                }
            }
        })
        if(!this.computeShader) {
            this.vertexShader = this.vertexShader.substring(0, vertexMainBodyStart) + vertexMainBody;
            this.fragmentShader = this.fragmentShader.substring(0, fragmentMainBodyStart) + fragmentMainBody;
        } else {
            this.computeShader = this.computeShader.substring(0, computeMainBodyStart) + computeMainBody;
        }
        //
        let getUniformDef = (uniformsGroup, groupIndex, textures, samplers, visibility) => {
            let uniformDef = '';
            if (uniformsGroup && uniformsGroup.mergedStructDef && (uniformsGroup.visibility & visibility)) {
                uniformDef += uniformsGroup.mergedStructDef + '\n';
            }
            if (uniformsGroup && uniformsGroup.mergedUniform && (uniformsGroup.visibility & visibility)) {
                uniformDef += '@binding(' + uniformsGroup.mergedUniform.bindingPoint + ') @group(' + groupIndex + ')' +
                    ' var<uniform> ' + uniformsGroup.mergedUniform.name + ':' + uniformsGroup.mergedUniform.valueType + ';\n';
            }

            for (let i = 0, nTex = textures.length; i < nTex; ++i) {
                const texLayout = shaderSource.shaderResources.get(textures[i].name);
                if (texLayout.visibility & visibility) {
                    uniformDef += '@binding(' + texLayout.binding + ') @group(' + texLayout.group + ') var ' + texLayout.name + ':' + texLayout.type + ';\n';
                }
            }

            for (let i = 0, nSampler = samplers.length; i < nSampler; ++i) {
                const samplerLayout = shaderSource.shaderResources.get(samplers[i].name);
                if (samplerLayout.visibility & visibility) {
                    uniformDef += '@binding(' + samplerLayout.binding + ') @group(' + samplerLayout.group + ') var ' + samplerLayout.name + ':' + samplerLayout.type + ';\n';
                }
            }
            return uniformDef;
        }
        let replaceResourceDef = (shader, visibility)=>{
            let _cameraUniformsGroup, _sceneUniformsGroup, _mtlUniformsGroup, _objUniformsGroup, _customUniformsGroup;
            if (cameraBindingGroup.groupIndex > -1 && (cameraBindingGroup.uniformVisibility & visibility)) {
                _cameraUniformsGroup = CameraUniformsGroup;
            }
            if (sceneBindingGroup.groupIndex > -1 && (sceneBindingGroup.uniformVisibility & visibility)) {
                _sceneUniformsGroup = SceneUniformsGroup;
            }
            if (mtlUniformsGroup.uniforms.length > 0 && (mtlUniformsGroup.visibility & visibility)) {
                _mtlUniformsGroup = mtlUniformsGroup;
            }
            if (objUniformsGroup.uniforms.length > 0 && (objUniformsGroup.visibility & visibility)) {
                _objUniformsGroup = objUniformsGroup;
            }
            shader = shader.replace(/@UniformStruct/, () => {
                let uniformDef = '';
                if(this._needsCameraUniforms) {
                    uniformDef += getUniformDef(_cameraUniformsGroup, cameraBindingGroup.groupIndex, cameraBindingGroup.textures, cameraBindingGroup.samplers, visibility);
                }
                if(this._needsSceneUniforms) {
                    uniformDef += getUniformDef(_sceneUniformsGroup, sceneBindingGroup.groupIndex, sceneBindingGroup.textures, sceneBindingGroup.samplers, visibility);
                }
                if(this._needsMtlUniforms) {
                    uniformDef += getUniformDef(_mtlUniformsGroup, mtlBindingGroup.groupIndex, mtlBindingGroup.textures, mtlBindingGroup.samplers, visibility);
                }
                if(this._needsObjUniforms) {
                    uniformDef += getUniformDef(_objUniformsGroup, objBindingGroup.groupIndex, objBindingGroup.textures, objBindingGroup.samplers, visibility);
                }
                if(this._needsCustomUniforms) {
                    for(let i=0; i<4; ++i)
                    {
                        _customUniformsGroup = null;
                        if(customUniformsGroup[i].uniforms.length > 0 &&  (customUniformsGroup[i].visibility & visibility) ) {
                            _customUniformsGroup = customUniformsGroup[i];
                        }
                        uniformDef += getUniformDef(_customUniformsGroup, customBindingGroup[i].groupIndex, customBindingGroup[i].textures, customBindingGroup[i].samplers, visibility);
                    }
                }
                return uniformDef;
            });
            //
            if(cameraBindingGroup.storages.length > 0) {
                for(let i=0, il = cameraBindingGroup.storages.length; i<il; ++i)
                {
                    if(cameraBindingGroup.storages[i].visibility & visibility) {
                        const re = new RegExp('@' + cameraBindingGroup.storages[i].name + '');
                        shader = shader.replace(re, '@binding('+cameraBindingGroup.storages[i].binding+') ' + '@group('+cameraBindingGroup.groupIndex+')');
                    }
                }
            }
            if(sceneBindingGroup.storages.length > 0) {
                for(let i=0, il = sceneBindingGroup.storages.length; i<il; ++i)
                {
                    if(sceneBindingGroup.storages[i].visibility & visibility) {
                        const re = new RegExp('@' + sceneBindingGroup.storages[i].name + '');
                        shader = shader.replace(re, '@binding('+sceneBindingGroup.storages[i].binding+') ' + '@group('+sceneBindingGroup.groupIndex+')');
                    }
                }
            }
            if(mtlBindingGroup.storages.length > 0) {
                for(let i=0, il = mtlBindingGroup.storages.length; i<il; ++i)
                {
                    if(mtlBindingGroup.storages[i].visibility & visibility) {
                        const re = new RegExp('@' + mtlBindingGroup.storages[i].name + '');
                        shader = shader.replace(re, '@binding('+mtlBindingGroup.storages[i].binding+') ' + '@group('+mtlBindingGroup.groupIndex+')');
                    }
                }
            }
            if(objBindingGroup.storages.length > 0) {
                for(let i=0, il = objBindingGroup.storages.length; i<il; ++i)
                {
                    if(objBindingGroup.storages[i].visibility & visibility) {
                        const re = new RegExp('@' + objBindingGroup.storages[i].name + '');
                        shader = shader.replace(re, '@binding('+objBindingGroup.storages[i].binding+') ' + '@group('+objBindingGroup.groupIndex+')');
                    }
                }
            }
            for(let n=0; n<4; ++n)
            {
                const _customBindingGroup = customBindingGroup[n];
                for(let i=0, il = _customBindingGroup.storages.length; i<il; ++i)
                {
                    if(_customBindingGroup.storages[i].visibility & visibility) {
                        const re = new RegExp('@' + _customBindingGroup.storages[i].name + '');
                        shader = shader.replace(re, '@binding('+_customBindingGroup.storages[i].binding+') ' + '@group('+_customBindingGroup.groupIndex+')');
                    }
                }
            }
            //
            return shader;
        }
        if (this.shaderResources.size > 0) {
            if(!this.computeShader) {
                this.vertexShader = replaceResourceDef(this.vertexShader, GPUShaderStage.VERTEX);
                this.fragmentShader = replaceResourceDef(this.fragmentShader, GPUShaderStage.FRAGMENT);
            } else {
                this.computeShader = replaceResourceDef(this.computeShader, GPUShaderStage.COMPUTE);
            }
        } else {
            if(!this.computeShader) {
                this.vertexShader = this.vertexShader.replace(/@UniformStruct/, '');
                this.fragmentShader = this.fragmentShader.replace(/@UniformStruct/, '');
            } else {
                this.computeShader = this.computeShader.replace(/@UniformStruct/, '');
            }
        }
        //
        this.bindGroupLayoutEntries = [];
        let gatherBindings = (filter, groupIndex, layoutEntry, textures, samplers, uniformsGroup, uniforms, storages=[]) => {
            if(!layoutEntry || layoutEntry.size === 0) {
                return;
            }
            //
            this.bindGroupLayoutEntries[groupIndex] = [];
            layoutEntry.forEach((value, key, map) => {
                if(value.visibility&GPUShaderStage.VERTEX && value.buffer && value.buffer.type === GPUBufferBindingType.Storage) {
                    value.buffer.type = GPUBufferBindingType.ReadOnlyStorage;
                }
                this.bindGroupLayoutEntries[groupIndex].push(value);
            });
            this.bindGroupLayoutEntries[groupIndex].sort((a, b) => {
                return a.binding - b.binding;
            });
            //
            uniformsGroup.gpuTypesLayout = this.gpuTypesLayout;
            this.bindingGroups[groupIndex] = new WebGPUBindingGroup(filter);
            this.bindingGroups[groupIndex].push(uniformsGroup);
            for(let n=0, nl = storages.length; n<nl; ++n)
            {
                storages[n].gpuTypesLayout = this.gpuTypesLayout;
                this.bindingGroups[groupIndex].push(storages[n]);
            }
            for (let n = 0; n < textures.length; ++n) {
                this.bindingGroups[groupIndex].push(uniforms ? uniforms[textures[n].name] : textures[n]);
            }
            for (let n = 0; n < samplers.length; ++n) {
                this.bindingGroups[groupIndex].push(uniforms ? uniforms[samplers[n].name] : samplers[n]);
            }
        }
        if (cameraBindingGroup.groupIndex > -1) {
            gatherBindings(
                UniformFilter.CAMERA,
                cameraBindingGroup.groupIndex,
                WebGPUShaderSource.cameraUniforms.layoutEntry,
                cameraBindingGroup.textures, cameraBindingGroup.samplers,
                CameraUniformsGroup, CameraUniforms, cameraBindingGroup.storages
            );
        }
        if (sceneBindingGroup.groupIndex > -1) {
            gatherBindings(
                UniformFilter.SCENE,
                sceneBindingGroup.groupIndex,
                WebGPUShaderSource.sceneUniforms[sceneId].layoutEntry,
                sceneBindingGroup.textures, sceneBindingGroup.samplers,
                SceneUniformsGroup, SceneUniforms, sceneBindingGroup.storages
            );
        }
        if (mtlBindingGroup.groupIndex > -1) {
            gatherBindings(
                UniformFilter.MATERIAL,
                mtlBindingGroup.groupIndex,
                mtlBindingGroup.layoutEntry,
                mtlBindingGroup.textures, mtlBindingGroup.samplers,
                mtlUniformsGroup, null, mtlBindingGroup.storages
            );
        }
        if (objBindingGroup.groupIndex > -1) {
            gatherBindings(
                UniformFilter.OBJECT,
                objBindingGroup.groupIndex,
                objBindingGroup.layoutEntry,
                objBindingGroup.textures, objBindingGroup.samplers,
                objUniformsGroup, null, objBindingGroup.storages
            );
        }
        for(let i=0; i<4; ++i)
        {
            if(customBindingGroup[i].groupIndex > -1) {
                gatherBindings(
                    UniformFilter.CUSTOM,
                    customBindingGroup[i].groupIndex,
                    customBindingGroup[i].layoutEntry,
                    customBindingGroup[i].textures, customBindingGroup[i].samplers,
                    customUniformsGroup[i], null, customBindingGroup[i].storages
                )
            }
        }
    }
}

CameraUniformsGroup.addUniform(WebGPUUniform.createUniform('viewMatrix', 'mat4x4<f32>'));
CameraUniformsGroup.addUniform(WebGPUUniform.createUniform('projectionMatrix', 'mat4x4<f32>'));
CameraUniformsGroup.addUniform(WebGPUUniform.createUniform('cameraPosition', 'vec3<f32>'));
CameraUniformsGroup.addUniform(WebGPUUniform.createUniform('isOrthographic', 'i32'));
CameraUniformsGroup.addUniform(WebGPUUniform.createUniform('logDepthBufFC', 'f32'));
WebGPUShaderSource.cameraUniformsGroup = CameraUniformsGroup;
WebGPUShaderSource.cameraUniforms = {
    uniforms: {
        viewMatrix: CameraUniformsGroup.getUniform('viewMatrix'),
        projectionMatrix: CameraUniformsGroup.getUniform('projectionMatrix'),
        cameraPosition: CameraUniformsGroup.getUniform('cameraPosition'),
        isOrthographic: CameraUniformsGroup.getUniform('isOrthographic'),
        logDepthBufFC: CameraUniformsGroup.getUniform('logDepthBufFC')
    },
    uniformsGroup: CameraUniformsGroup,
    bindingGroup: new WebGPUBindingGroup(UniformFilter.CAMERA),
    layoutEntry: new Map([[CameraUniformsGroup.name, {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
            type : GPUBufferBindingType.Unifrom,
            hasDynamicOffset : false,
            minBindingSize : 0
        }
    }]])
};
WebGPUShaderSource.cameraUniforms.bindingGroup[0] = CameraUniformsGroup;

WebGPUShaderSource.sceneUniforms = {

};


WebGPUShaderSource.vertexInputBuiltinValues = [
    'vertex_index',
    'instance_index'
];
WebGPUShaderSource.vertexOutputBuiltinValues = [
    'position'
];
WebGPUShaderSource.fragmentInputBuiltinValues = [
    'position',
    'front_facing',
    'sample_index',
    'sample_mask',
];
WebGPUShaderSource.fragmentOutputBuiltinValues = [
    'frag_depth',
    'sample_mask'
];
WebGPUShaderSource.computeInputBuiltinValues = [
    'local_invocation_id',
    'local_invocation_index',
    'global_invocation_id',
    'workgroup_id',
    'num_workgroups'
];
WebGPUShaderSource.builtinValueType = {
    vertex_index: 'u32',
    instance_index: 'u32',
    position: 'vec4<f32>',
    front_facing: 'bool',
    frag_depth: 'f32',
    local_invocation_id: 'vec3<u32>',
    local_invocation_index: 'u32',
    global_invocation_i: 'vec3<u32>',
    workgroup_id: 'vec3<u32>',
    num_workgroups: 'vec3<u32>',
    sample_index: 'u32',
    sample_mask: 'u32'
}


export {WebGPUShaderSource};
