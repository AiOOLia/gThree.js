import {Vector3, Matrix4, Color, Frustum, Mesh, BoxGeometry, LinearEncoding, MeshPhongMaterial} from "three";

import { GPUIndexFormat, GPUTextureFormat, GPUStoreOp, GPUFeatureName, GPULoadOp } from './webgpu/constants.js';
import { WebGPUShaderSources} from "./webgpu/WebGPUShaderSources";
import WebGPUObjects from './webgpu/WebGPUObjects.js';
import WebGPUAttributes from './webgpu/WebGPUAttributes.js';
import WebGPUGeometries from './webgpu/WebGPUGeometries.js';
import WebGPUInfo from './webgpu/WebGPUInfo.js';
import WebGPUProperties from './webgpu/WebGPUProperties.js';
import WebGPURenderPipelines from './webgpu/WebGPURenderPipelines.js';
import WebGPUComputePipelines from './webgpu/WebGPUComputePipelines.js';
import WebGPUBindings from './webgpu/WebGPUBindings.js';
import WebGPURenderLists from './webgpu/WebGPURenderLists.js';
import WebGPUTextures from './webgpu/WebGPUTextures.js';
import WebGPUBackground from './webgpu/WebGPUBackground.js';
import {WebGPUMaterials} from "./webgpu/WebGPUMaterials";
import WebGPUBindGroupLayouts from "./webgpu/WebGPUBindGroupLayouts";
import { createElementNS } from '../utils.js';
import {WebGPULights} from "./webgpu/WebGPULights";
import {WebGPUShaderSource} from "./webgpu/WebGPUShaderSource";
import {UniformFilter} from "./shaders/UniformsLib";
import {WebGPUChunkedUniformBuffer} from "./webgpu/WebGPUChunkedUniformBuffer";

console.info( 'THREE.WebGPURenderer: Modified Matrix4.makePerspective() and Matrix4.makeOrtographic() to work with WebGPU, see https://github.com/mrdoob/three.js/issues/20276.' );

Matrix4.prototype.makePerspective = function ( left, right, top, bottom, near, far ) {

    const te = this.elements;
    const x = 2 * near / ( right - left );
    const y = 2 * near / ( top - bottom );

    const a = ( right + left ) / ( right - left );
    const b = ( top + bottom ) / ( top - bottom );
    const c = - far / ( far - near );
    const d = - far * near / ( far - near );

    te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a;	te[ 12 ] = 0;
    te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b;	te[ 13 ] = 0;
    te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c;	te[ 14 ] = d;
    te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = - 1;	te[ 15 ] = 0;

    return this;

};

Matrix4.prototype.makeOrthographic = function ( left, right, top, bottom, near, far ) {

    const te = this.elements;
    const w = 1.0 / ( right - left );
    const h = 1.0 / ( top - bottom );
    const p = 1.0 / ( far - near );

    const x = ( right + left ) * w;
    const y = ( top + bottom ) * h;
    const z = near * p;

    te[ 0 ] = 2 * w;	te[ 4 ] = 0;	te[ 8 ] = 0;	te[ 12 ] = - x;
    te[ 1 ] = 0;	te[ 5 ] = 2 * h;	te[ 9 ] = 0;	te[ 13 ] = - y;
    te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = - 1 * p;	te[ 14 ] = - z;
    te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = 0;	te[ 15 ] = 1;

    return this;

};


const _frustum = new Frustum();
const _projScreenMatrix = new Matrix4();
const _vector3 = new Vector3();

class WebGPURenderer {

    constructor( parameters = {} ) {

        // public

        this._createCanvasElement = ()=> {
            //const canvas = createElementNS( 'canvas' );
            const canvas = document.createElement('canvas')
            canvas.style.display = 'block';
            return canvas;
        }
        this.domElement = ( parameters.canvas !== undefined ) ? parameters.canvas : this._createCanvasElement();

        this.autoClear = true;
        this.autoClearColor = true;
        this.autoClearDepth = true;
        this.autoClearStencil = true;

        this.outputEncoding = LinearEncoding;

        this.sortObjects = true;

        // internals

        this._parameters = Object.assign( {}, parameters );

        this._pixelRatio = 1;
        this._width = this.domElement.width;
        this._height = this.domElement.height;

        this._viewport = null;
        this._scissor = null;

        this._adapter = null;
        this._device = null;
        this._context = null;
        this._colorBuffer = null;
        this._colorBufferView = null;
        this._depthBuffer = null;
        this._depthBufferView = null;

        this._info = null;
        this._shaderSources = null;
        this._properties = null;
        this._attributes = null;
        this._geometries = null;
        this._bindings = null;
        this._objects = null;
        this._renderPipelines = null;
        this._renderLists = null;
        this._textures = null;
        this._background = null;
        this._lights = null;
        this._sceneUniformsGroupObj = new Mesh(new BoxGeometry(), new MeshPhongMaterial());
        this._sceneUniformsGroupObj.material.updateSceneUniforms = true;

        this._updatingChunkedUniformBuffers = new Map();

        this._renderPassDescriptor = null;

        this._currentRenderList = null;
        this._opaqueSort = null;
        this._transparentSort = null;

        this._clearAlpha = 1;
        this._clearColor = new Color( 0x000000 );
        this._clearDepth = 1;
        this._clearStencil = 0;

        this._renderTarget = null;

        // some parameters require default values other than "undefined"

        this._parameters.antialias = ( parameters.antialias === true );

        if ( this._parameters.antialias === true ) {

            this._parameters.sampleCount = ( parameters.sampleCount === undefined ) ? 4 : parameters.sampleCount;

        } else {

            this._parameters.sampleCount = 1;

        }

        this._parameters.requiredFeatures = ( parameters.requiredFeatures === undefined ) ? [] : parameters.requiredFeatures;
        this._parameters.requiredLimits = ( parameters.requiredLimits === undefined ) ? {} : parameters.requiredLimits;
        this._parameters.powerPreference = parameters.powerPreference ? parameters.powerPreference : 'high-performance';

        let renderer = this;

        this._projectObject = ( object, camera, groupOrder, lights, shadows )=> {

            const currentRenderList = this._currentRenderList;

            if ( object.visible === false ) return;

            const visible = object.layers.test( camera.layers );

            if ( visible ) {

                if ( object.isGroup ) {

                    groupOrder = object.renderOrder;

                } else if ( object.isLOD ) {

                    if ( object.autoUpdate === true ) object.update( camera );

                } else if ( object.isLight ) {

                    lights.push( object );

                    if ( object.castShadow ) {

                        shadows.push( object );

                    }

                } else if ( object.isSprite ) {

                    if ( ! object.frustumCulled || _frustum.intersectsSprite( object ) ) {

                        if ( this.sortObjects === true ) {

                            _vector3.setFromMatrixPosition( object.matrixWorld ).applyMatrix4( _projScreenMatrix );

                        }

                        const geometry = object.geometry;
                        const material = this._overrideMaterial ? this._overrideMaterial : object.material;

                        if ( material.visible ) {

                            currentRenderList.push( object, geometry, material, groupOrder, _vector3.z, null );

                        }

                    }

                } else if ( object.isLineLoop ) {

                    console.error( 'THREE.WebGPURenderer: Objects of type THREE.LineLoop are not supported. Please use THREE.Line or THREE.LineSegments.' );

                } else if ( object.isMesh || object.isLine || object.isPoints ) {

                    if ( ! object.frustumCulled || _frustum.intersectsObject( object ) ) {

                        if ( this.sortObjects === true ) {

                            _vector3.setFromMatrixPosition( object.matrixWorld ).applyMatrix4( _projScreenMatrix );

                        }

                        const geometry = object.geometry;
                        const material = this._overrideMaterial ? this._overrideMaterial : object.material;

                        if ( Array.isArray( material ) ) {

                            const groups = geometry.groups;

                            for ( let i = 0, l = groups.length; i < l; i ++ ) {

                                const group = groups[ i ];
                                const groupMaterial = material[ group.materialIndex ];

                                if ( groupMaterial && groupMaterial.visible ) {

                                    currentRenderList.push( object, geometry, groupMaterial, groupOrder, _vector3.z, group );

                                }

                            }

                        } else if ( material.visible ) {

                            currentRenderList.push( object, geometry, material, groupOrder, _vector3.z, null );

                        }
                    }
                }
            }

            const children = object.children;

            for ( let i = 0, l = children.length; i < l; i ++ ) {

                this._projectObject( children[ i ], camera, groupOrder, lights, shadows );

            }

        }

        this._updateCameraUniforms = (camera)=> {
            if(!camera.bindingGroup) {
                camera.bindingGroup = WebGPUShaderSource.cameraUniforms.bindingGroup.clone();
            }
            //
            const cameraUniforms = WebGPUShaderSource.cameraUniforms.uniforms;
            const cameraUniformsGroup = camera.bindingGroup[0];

            if(!cameraUniformsGroup.bufferGPU) {
                cameraUniformsGroup.createGPUBuffer(this._device);
            }
            cameraUniformsGroup.bindBufferToUniforms();
            //
            if(cameraUniforms.viewMatrix) {
                cameraUniforms.viewMatrix.value = (camera.matrixWorldInverse);
            }
            if(cameraUniforms.cameraPosition) {
                cameraUniforms.cameraPosition.setFromMatrixPosition( camera.matrixWorld );
            }
            if(cameraUniforms.projectionMatrix) {
                cameraUniforms.projectionMatrix.value = camera.projectionMatrix;
            }
            if(cameraUniforms.logDepthBufFC) {
                cameraUniforms.logDepthBufFC.value = 2.0 / ( Math.log( camera.far + 1.0 ) / Math.LN2 );
            }
            if(cameraUniforms.isOrthographic !== undefined) {
                if(camera.isOrthographicCamera === true) {
                    cameraUniforms.isOrthographic.value = 1;
                } else {
                    cameraUniforms.isOrthographic.value = 0;
                }
            }
            //
            cameraUniformsGroup.updateGPUBuffer(this._device);
        }

        this._updateSceneUniforms = (scene)=> {
            const sceneUniforms = WebGPUShaderSource.sceneUniforms[scene.uuid].uniforms;
            const sceneBindingGroup = WebGPUShaderSource.sceneUniforms[scene.uuid].bindingGroup;
            const sceneUniformsGroup = sceneBindingGroup[0];

            if(!sceneUniformsGroup.bufferGPU) {
                sceneUniformsGroup.createGPUBuffer(this._device);
            }
            sceneUniformsGroup.bindBufferToUniforms();
            //
            if(scene.fog) {
                this._materials.refreshFogUniforms(sceneUniforms, scene.fog);
            }
            //
            if(sceneUniforms.ambientLightColor) {
                sceneUniforms.ambientLightColor.value = this._lights.ambient;
            }
            if(sceneUniforms.lightProbe) {
                sceneUniforms.lightProbe.value = this._lights.probe;
            }
            if(sceneUniforms.directionalLights) {
                sceneUniforms.directionalLights.value = this._lights.directional;
            }
            if(sceneUniforms.directionalLightShadows) {
                sceneUniforms.directionalLightShadows.value = this._lights.directionalShadow;
            }
            if(sceneUniforms.spotLights) {
                sceneUniforms.spotLights.value = this._lights.spot;
            }
            if(sceneUniforms.spotLightShadows) {
                sceneUniforms.spotLightShadows.value = this._lights.spotShadow;
            }
            if(sceneUniforms.rectAreaLights) {
                sceneUniforms.rectAreaLights.value = this._lights.rectArea;
            }
            if(sceneUniforms.ltc_1) {
                sceneUniforms.ltc_1.value = this._lights.rectAreaLTC1;
            }
            if(sceneUniforms.ltc_2) {
                sceneUniforms.ltc_2.value = this._lights.rectAreaLTC2;
            }
            if(sceneUniforms.pointLights) {
                sceneUniforms.pointLights.value = this._lights.point;
            }
            if(sceneUniforms.pointLightShadows) {
                sceneUniforms.pointLightShadows.value = this._lights.pointShadow;
            }
            if(sceneUniforms.hemisphereLights) {
                sceneUniforms.hemisphereLights.value = this._lights.hemi;
            }
            if(sceneUniforms.directionalShadowMap) {
                sceneUniforms.directionalShadowMap.value = this._lights.directionalShadowMap;
            }
            if(sceneUniforms.directionalShadowMatrix) {
                sceneUniforms.directionalShadowMatrix.value = this._lights.directionalShadowMatrix;
            }
            if(sceneUniforms.spotShadowMap) {
                sceneUniforms.spotShadowMap.value = this._lights.spotShadowMap;
            }
            if(sceneUniforms.spotShadowMatrix) {
                sceneUniforms.spotShadowMatrix.value = this._lights.spotShadowMatrix;
            }
            if(sceneUniforms.pointShadowMap) {
                sceneUniforms.pointShadowMap.value = this._lights.pointShadowMap;
            }
            if(sceneUniforms.pointShadowMatrix) {
                sceneUniforms.pointShadowMatrix.value = this._lights.pointShadowMatrix;
            }
            // TODO (abelnation): add area lights shadow info to uniforms
            //
            sceneUniformsGroup.updateGPUBuffer(this._device);
        }


        function onShaderSourceDispose( shaderSource ) {
            const shaderProperties = renderer._properties.get(shaderSource);
            if(shaderProperties.chunkedUniformsBuffers) {
                shaderProperties.chunkedUniformsBuffers.dispose();
            }
            renderer._properties.remove(shaderSource);
        }

        function onMaterialDispose( event ) {
            const material = event.target;

            if(material.usedTimes) {
                material.usedTimes--;
            }
            if(material.usedTimes<1) {
                material.removeEventListener( 'dispose', onMaterialDispose );
                deallocateMaterial( material );
            }
        }

        // Buffer deallocation
        function deallocateMaterial( material ) {
            let materialProperties = renderer._properties.get( material );
            if(materialProperties.needsUniformBuffer) {
                materialProperties.bindingGroup[0].dispose();
            }

            const pipelines = materialProperties.pipelines;

            if ( pipelines !== undefined ) {

                pipelines.forEach((value,key, map)=>{
                    value.bindingMaterials.delete(material);
                    renderer._renderPipelines.releasePipeline(value, material, onShaderSourceDispose);
                })
            }

            renderer._properties.remove( material );
        }


        function onObjectDispose( event ) {
            const object = event.target;
            object.removeEventListener( 'dispose', onObjectDispose );
            renderer._bindings.remove(object);
            renderer._properties.remove(object);
        }

        this._renderObjects = ( renderList, scene, camera, passEncoder )=> {
            // process renderable objects

            for ( let i = 0, il = renderList.length; i < il; i ++ ) {

                const renderItem = renderList[ i ];

                // @TODO: Add support for multiple materials per object. This will require to extract
                // the material from the renderItem object and pass it with its group data to _renderObject().

                this._renderObject( renderItem, scene, camera, passEncoder );
            }
        }

        this._renderScene = (currentRenderList, scene, camera, passEncoder, viewport)=> {
            if(viewport) {
                const minDepth = ( viewport.minDepth === undefined ) ? 0 : viewport.minDepth;
                const maxDepth = ( viewport.maxDepth === undefined ) ? 1 : viewport.maxDepth;

                passEncoder.setViewport( viewport.x, viewport.y, viewport.width, viewport.height, minDepth, maxDepth );
            }

            // process render lists

            const opaqueObjects = this._currentRenderList.opaque;
            const transparentObjects = this._currentRenderList.transparent;

            this._updatingChunkedUniformBuffers.clear();

            let channels = [opaqueObjects, transparentObjects];
            let shaders = new Set();
            let materials = new Set();
            let cameraBindingGroup = camera.bindingGroup;
            let cameraBindingGroupLayout;
            let sceneBindingGroup = WebGPUShaderSource.sceneUniforms[scene.uuid].bindingGroup;
            let sceneBindingGroupLayout;
            for(let n=0, nc = channels.length; n<nc; ++n) {
                for(let i=0, nRenderItm = channels[n].length; i<nRenderItm; ++i) {
                    const itm = channels[n][i];
                    const renderPipeline = this._renderPipelines.get(itm.object, itm.material, this._lights, {}, scene);
                    const shaderSource = renderPipeline.shaderSource;
                    const uniforms = shaderSource.uniforms;
                    const storages = shaderSource.storages;
                    const bindings = shaderSource.bindingGroups;
                    //
                    itm.renderPipeline = renderPipeline;
                    itm.bindings = bindings;
                    itm.uniforms = uniforms;
                    itm.storages = storages;
                    //
                    if(materials.has(itm.material)) {
                        itm.material.usedTimes++;
                    } else {
                        itm.material.usedTimes = 1;
                        materials.add(itm.material);
                    }
                    //
                    if(shaders.has(shaderSource)) {
                        shaderSource.numRenderItmUsed++;
                    } else {
                        shaderSource.numRenderItmUsed = 1;
                        shaders.add(shaderSource);
                    }
                    //
                    let cameraBindingIndex = -1;
                    let sceneBindingIndex = -1;
                    let mtlBindingIndex = -1;
                    let objBindingIndex = -1;
                    for(let i=0, il = bindings.length; i<il; ++i) {
                        if(bindings[i].filter === UniformFilter.CAMERA) {
                            cameraBindingIndex = i;
                        } else if(bindings[i].filter === UniformFilter.SCENE) {
                            sceneBindingIndex = i;
                        } else if(bindings[i].filter === UniformFilter.MATERIAL) {
                            mtlBindingIndex = i;
                        } else if(bindings[i].filter === UniformFilter.OBJECT) {
                            objBindingIndex = i;
                        }
                    }
                    //
                    if(cameraBindingIndex > -1 && !cameraBindingGroupLayout) {
                        cameraBindingGroupLayout = renderPipeline.bindGroupLayouts[cameraBindingIndex];
                        itm.uniforms[cameraBindingIndex] = cameraBindingGroup.getUniforms();
                        itm.storages[cameraBindingIndex] = cameraBindingGroup.getStorages();
                    }
                    if(sceneBindingIndex > -1 && !sceneBindingGroupLayout) {
                        sceneBindingGroupLayout = renderPipeline.bindGroupLayouts[sceneBindingIndex];
                        itm.uniforms[sceneBindingIndex] = sceneBindingGroup.getUniforms();
                        itm.storages[sceneBindingIndex] = sceneBindingGroup.getStorages();
                    }
                    //
                    let materialProperties = this._properties.get(itm.material);
                    if(materialProperties.id === undefined) {
                        materialProperties.id = itm.material.uuid;
                        materialProperties.bindingIndex = mtlBindingIndex;
                        materialProperties.bindingGroup = mtlBindingIndex > -1 ? bindings[mtlBindingIndex].clone() : null;
                        materialProperties.uniforms = mtlBindingIndex > -1 ? materialProperties.bindingGroup.getUniforms() : {};
                        materialProperties.storages = mtlBindingIndex > -1 ? materialProperties.bindingGroup.getStorages() : {};
                        materialProperties.bindingGroupLayout = mtlBindingIndex > -1 ? renderPipeline.bindGroupLayouts[mtlBindingIndex] : null;
                        materialProperties.needsUniformBuffer = (mtlBindingIndex > -1 && bindings[mtlBindingIndex][0].isUniformsGroup) ? true : false;
                        materialProperties.gpuTypesLayout = shaderSource.gpuTypesLayout;
                        materialProperties.pipelines = new Map();

                        if(mtlBindingIndex > -1 && materialProperties.needsUniformBuffer) {
                            materialProperties.bindingGroup[0].createGPUBuffer(this._device);
                        }
                        //
                        itm.material.addEventListener( 'dispose', onMaterialDispose );
                    }
                    if(!materialProperties.pipelines.has(renderPipeline.uuid)) {
                        materialProperties.pipelines.set(renderPipeline.uuid, renderPipeline);
                    }
                    materialProperties.environment = itm.material.isMeshStandardMaterial ? scene.environment : null;
                    materialProperties.fog = scene.fog;
                    //materialProperties.envMap = ( material.isMeshStandardMaterial ? cubeuvmaps : cubemaps ).get( material.envMap || materialProperties.environment );
                    materialProperties.envMap = itm.material.envMap || materialProperties.environment;

                    if(materialProperties.bindingIndex > -1) {
                        itm.mtlBindingGroup = materialProperties.bindingGroup;
                        itm.mtlBindingGroupLayout = renderPipeline.bindGroupLayouts[materialProperties.bindingIndex];
                        itm.uniforms[mtlBindingIndex] = materialProperties.uniforms;
                        itm.storages[mtlBindingIndex] = materialProperties.storages;
                    }
                    //
                    let shaderProperties = this._properties.get(shaderSource);
                    if(shaderProperties.id === undefined) {
                        shaderProperties.id = shaderSource.uuid;
                        shaderProperties.bindingGroups = new WeakMap();
                        shaderProperties.needsObjectUniformBuffer = (objBindingIndex > -1 && bindings[objBindingIndex][0].isUniformsGroup) ? true : false;
                        if(shaderProperties.needsObjectUniformBuffer) {
                            shaderProperties.objectUniformBufferSize = bindings[objBindingIndex][0].getByteLength();
                        }
                    }
                    itm.shaderProperties = shaderProperties;
                    //
                    let objectProperties = this._properties.get(itm.object);
                    if(objectProperties.id === undefined) {
                        objectProperties.id = itm.object.uuid;
                        objectProperties.bindingIndex = objBindingIndex;
                        objectProperties.uniforms = objBindingIndex > -1 ? uniforms[objBindingIndex] : {};
                        objectProperties.bindingGroupLayout = objBindingIndex > -1 ? renderPipeline.bindGroupLayouts[objBindingIndex] : null;
                        itm.object.addEventListener('dispose', onObjectDispose);
                    }
                    itm.objectProperties = objectProperties;
                    //
                    if(objBindingIndex > -1) {
                        if(!objectProperties.bindingGroup) {
                            objectProperties.bindingGroup = bindings[objBindingIndex].clone();
                            shaderProperties.bindingGroups.set(itm.object, objectProperties.bindingGroup);
                        } else {
                            let bindingGroup = shaderProperties.bindingGroups.get(itm.object);
                            if(!bindingGroup) {
                                bindingGroup = bindings[objBindingIndex].clone();
                                shaderProperties.bindingGroups.set(itm.object, bindingGroup);
                            }
                            if(bindingGroup!== objectProperties.bindingGroup) {
                                objectProperties.bindingGroup = bindingGroup;
                                //
                                if(itm.object.uniformsData) {
                                    itm.object.uniformsData.needsUpdate = true;
                                }
                            }
                        }
                        itm.objBindingGroup = objectProperties.bindingGroup;
                        itm.objBindingGroupLayout = objectProperties.bindingGroupLayout;
                        itm.uniforms[objBindingIndex] = itm.objBindingGroup.getUniforms();
                        itm.storages[objBindingIndex] = itm.objBindingGroup.getStorages();
                    }
                }
            }
            //
            if(cameraBindingGroupLayout) {
                camera.uniformsData = this._bindings.get(camera, cameraBindingGroup, cameraBindingGroupLayout);
            }

            if(sceneBindingGroupLayout) {
                scene.uniformsData = this._bindings.get(scene, sceneBindingGroup, sceneBindingGroupLayout);
            }

            materials.forEach((value, value2, set)=>{
                const material = value;
                const materialProperties = this._properties.get(material);
                if(materialProperties.bindingGroup && materialProperties.needsUniformBuffer) {
                    materialProperties.bindingGroup[0].bindBufferToUniforms();
                    materialProperties.bindingGroup[0].needsUpdate = true;
                }
                this._materials.refreshMaterialUniforms(materialProperties.uniforms, material, this._pixelRatio, this._height);
                //
                const uniformData = this._bindings.get(material, materialProperties.bindingGroup, materialProperties.bindingGroupLayout);
                this._bindings.update(uniformData, materialProperties.gpuTypesLayout, true);
                material.uniformsData = uniformData;
            });
            //
            shaders.forEach((value, value2, set)=> {
                const shaderSource = value;
                let shaderProperties = this._properties.get(shaderSource);
                if(shaderSource.numRenderItmUsed > 1 && shaderProperties.needsObjectUniformBuffer && !shaderProperties.chunkedUniformsBuffers) {
                    shaderProperties.chunkedUniformsBuffers = new WebGPUChunkedUniformBuffer(this._device);
                    shaderProperties.chunkedUniformsBuffers.init(shaderProperties.objectUniformBufferSize, shaderSource.numRenderItmUsed, this._limits.minUniformBufferOffsetAlignment, this._limits.maxUniformBufferBindingSize );
                }
            });
            //
            if ( opaqueObjects.length > 0 ) this._renderObjects( opaqueObjects, scene, camera, passEncoder );
            if ( transparentObjects.length > 0 ) this._renderObjects( transparentObjects, scene, camera, passEncoder );
            //
            this._updatingChunkedUniformBuffers.forEach((value, key, map)=>{
                const chunkedBuffer = key;
                const chunks = value;
                for(let i=0, il = chunks.length; i<il; ++i) {
                    if(chunks[i]) {
                        chunkedBuffer.updateChunk(i);
                    }
                }
            });
        }

        this._updateBindings = (renderItem, scene, camera, passEncoder)=> {
            for(let i=0, numBindingGroup = renderItem.bindings.length; i<numBindingGroup; ++i) {
                //
                if(renderItem.bindings[i].filter === UniformFilter.CAMERA) {
                    passEncoder.setBindGroup( i, camera.uniformsData.group );
                } else if(renderItem.bindings[i].filter === UniformFilter.SCENE) {
                    passEncoder.setBindGroup( i, scene.uniformsData.group );
                } else if(renderItem.bindings[i].filter === UniformFilter.MATERIAL) {
                    passEncoder.setBindGroup( i, renderItem.material.uniformsData.group );
                } else if(renderItem.bindings[i].filter === UniformFilter.OBJECT) {
                    const object = renderItem.object;

                    const shaderProperties = renderItem.shaderProperties;

                    if(object.uniformsData && object.uniformsData.needsUpdate) {
                        this._bindings.remove(object);
                        object.uniformsData = null;
                    }
                    const uniformsData = object.uniformsData? object.uniformsData : this._bindings.get(
                        renderItem.object, renderItem.objBindingGroup,
                        renderItem.objBindingGroupLayout,
                        shaderProperties.chunkedUniformsBuffers
                    );
                    if(!object.uniformsData) {
                        object.uniformsData = uniformsData;
                    }

                    if(uniformsData.bindings[0].isUniformsGroup) {
                        uniformsData.bindings[0].bindBufferToUniforms();
                        uniformsData.bindings[0].needsUpdate = true;
                    }
                    //
                    if(renderItem.storages[i].instanceMatrix) {
                        renderItem.storages[i].instanceMatrix.value = object.instanceMatrix.array;
                    }
                    if(renderItem.uniforms[i].modelMatrix) {
                        renderItem.uniforms[i].modelMatrix.value = object.matrixWorld;
                    }
                    if(renderItem.uniforms[i].modelViewMatrix) {
                        renderItem.uniforms[i].modelViewMatrix.value = object.modelViewMatrix;
                    }
                    if(renderItem.uniforms[i].normalMatrix) {
                        renderItem.uniforms[i].normalMatrix.value = object.normalMatrix;
                    }
                    //
                    if(renderItem.uniforms[i].receiveShadow !== undefined) {
                        if(object.receiveShadow) {
                            renderItem.uniforms[i].receiveShadow.value = 1;
                        } else {
                            renderItem.uniforms[i].receiveShadow.value = 0;
                        }
                    }
                    //
                    this._bindings.update(uniformsData, renderItem.renderPipeline.shaderSource.gpuTypesLayout, !shaderProperties.chunkedUniformsBuffers);
                    if(shaderProperties.chunkedUniformsBuffers &&
                        uniformsData.bindings[0].isUniformsGroup)  {
                        const bindingInfo = shaderProperties.chunkedUniformsBuffers.getBindingInfo(object);
                        if(!this._updatingChunkedUniformBuffers.has(shaderProperties.chunkedUniformsBuffers)) {
                            const chunks = [];
                            chunks[bindingInfo.chunkId] = true;
                            this._updatingChunkedUniformBuffers.set(shaderProperties.chunkedUniformsBuffers, chunks);
                        } else {
                            const chunks = this._updatingChunkedUniformBuffers.get(shaderProperties.chunkedUniformsBuffers);
                            if(!chunks[bindingInfo.chunkId]) chunks[bindingInfo.chunkId] = true;
                        }
                    }
                    //
                    passEncoder.setBindGroup( i, uniformsData.group );
                }
            }
        }

        this._renderObject = ( renderItem, scene, camera, passEncoder )=> {
            //
            const info = this._info;

            const object = renderItem.object;
            const geometry = renderItem.geometry;
            const material = renderItem.material;
            const group = renderItem.group;
            const renderPipeline = renderItem.renderPipeline;

            object.onBeforeRender( this, scene, camera, geometry, material, group );

            object.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );
            object.normalMatrix.getNormalMatrix( object.modelViewMatrix );

            this._objects.update( object );
            //
            // index
            let index = geometry.index;
            const position = geometry.attributes.position;
            //
            if ( index === null ) {
                if ( position === undefined || position.count === 0 ) return;
            } else if ( index.count === 0 ) {
                return;
            }

            let rangeFactor = 1;
            if(material.wireframe) {
                index = this._geometries.getWireframeAttribute( geometry );
                rangeFactor = 2;
            }
            // pipeline
            passEncoder.setPipeline( renderPipeline.pipeline );
            //
            this._updateBindings(renderItem, scene, camera, passEncoder);

            const hasIndex = ( index !== null );

            if ( hasIndex === true ) {
                this._setupIndexBuffer( index, passEncoder );
            }

            // vertex buffers

            this._setupVertexBuffers( geometry.attributes, passEncoder, renderPipeline );

            // draw

            const dataCount = ( index !== null ) ? index.count : position.count;

            const rangeStart = geometry.drawRange.start * rangeFactor;
            const rangeCount = geometry.drawRange.count * rangeFactor;

            const groupStart = group ? group.start * rangeFactor : 0;
            const groupCount = group ? group.count * rangeFactor : Infinity;

            const drawStart = Math.max( rangeStart, groupStart );
            const drawEnd = Math.min( dataCount, rangeStart + rangeCount, groupStart + groupCount ) - 1;

            const drawCount = Math.max( 0, drawEnd - drawStart + 1 );

            if ( drawCount === 0 ) return;

            const instanceCount = ( geometry.isInstancedBufferGeometry ) ? geometry.instanceCount : (object.isInstancedMesh ? object.count : 1);

            if ( hasIndex === true ) {

                passEncoder.drawIndexed( drawCount, instanceCount, drawStart, 0, 0 );

                info.update( object, drawCount, instanceCount );

            } else {

                passEncoder.draw( drawCount, instanceCount, drawStart, 0 );

                info.update( object, drawCount, instanceCount );
            }
            //
            object.onAfterRender( this, scene, camera, geometry, material, group );
        }

        this._setupIndexBuffer = ( index, encoder )=> {

            const buffer = this._attributes.get( index ).buffer;
            const indexFormat = ( index.array instanceof Uint16Array ) ? GPUIndexFormat.Uint16 : GPUIndexFormat.Uint32;

            encoder.setIndexBuffer( buffer, indexFormat );

        }

        this._setupVertexBuffers = ( geometryAttributes, encoder, renderPipeline )=> {

            const shaderAttributes = renderPipeline.shaderAttributes;

            for ( const shaderAttribute of shaderAttributes ) {

                const name = shaderAttribute.name;
                const slot = shaderAttribute.slot;

                const attribute = geometryAttributes[ name ];

                if ( attribute !== undefined ) {

                    const buffer = this._attributes.get( attribute ).buffer;
                    encoder.setVertexBuffer( slot, buffer );
                }
            }
        }

        this._setupColorBuffer = ()=> {

            const device = this._device;

            if ( device ) {

                if ( this._colorBuffer ) this._colorBuffer.destroy();

                this._colorBuffer = this._device.createTexture( {
                    size: {
                        width: Math.floor( this._width * this._pixelRatio ),
                        height: Math.floor( this._height * this._pixelRatio ),
                        depthOrArrayLayers: 1
                    },
                    sampleCount: this._parameters.sampleCount,
                    format: GPUTextureFormat.BGRA8Unorm,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT
                } );

                this._colorBufferView = this._colorBuffer.createView();
            }

        }

        this._setupDepthBuffer = ()=> {

            const device = this._device;

            if ( device ) {

                if ( this._depthBuffer ) this._depthBuffer.destroy();

                this._depthBuffer = this._device.createTexture( {
                    size: {
                        width: Math.floor( this._width * this._pixelRatio ),
                        height: Math.floor( this._height * this._pixelRatio ),
                        depthOrArrayLayers: 1
                    },
                    sampleCount: this._parameters.sampleCount,
                    format: GPUTextureFormat.Depth24PlusStencil8,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT
                } );

                this._depthBufferView = this._depthBuffer.createView();
            }
        }

        this._configureContext = ()=> {

            const device = this._device;
            const context = this._context;

            if ( device ) {
                context.configure( {
                    device: device,
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                    alphaMode: 'premultiplied'
                } );
                //
                this._context_configured_ = true;
            }
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

        const context = ( parameters.context !== undefined ) ? parameters.context : this.domElement.getContext( 'webgpu' );

        this._adapter = adapter;
        this._device = device;
        this._context = context;
        this._limits = this._device.limits;

        this._configureContext();

        this._info = new WebGPUInfo();
        this._shaderSources = new WebGPUShaderSources();
        this._properties = new WebGPUProperties();
        this._bindGroupLayouts = new WebGPUBindGroupLayouts(device);
        this._attributes = new WebGPUAttributes( device );
        this._geometries = new WebGPUGeometries( this._attributes, this._info );
        this._textures = new WebGPUTextures( device, this._properties, this._info );
        this._objects = new WebGPUObjects( this._geometries, this._info );
        this._renderPipelines = new WebGPURenderPipelines( this, device, parameters.sampleCount, this._shaderSources, this._bindGroupLayouts);
        this._bindings = this._renderPipelines.bindings = new WebGPUBindings( device, this._info, this._properties, this._textures, this._attributes, this._shaderSources );
        this._materials = new WebGPUMaterials(this._properties);
        this._renderLists = new WebGPURenderLists();
        this._background = new WebGPUBackground( this, this._objects );
        this._lights = new WebGPULights();
        //

        this._renderPassDescriptor = {
            colorAttachments: [ {
                view: null,
                loadOp: GPULoadOp.Clear,
                storeOp: GPUStoreOp.Store
            } ],
            depthStencilAttachment: {
                view: null,
                depthLoadOp: GPULoadOp.Clear,
                depthStoreOp: GPUStoreOp.Store,
                stencilLoadOp: GPULoadOp.Clear,
                stencilStoreOp: GPUStoreOp.Store
            }
        };

        this._setupColorBuffer();
        this._setupDepthBuffer();

        this._inialized_ = true;
    }

    render( scene, camera ) {
        if(!this._inialized_ ) {
            return Promise.resolve();
        }
        //
        if ( scene.autoUpdate === true ) scene.updateMatrixWorld();

        if ( camera.parent === null ) camera.updateMatrixWorld();

        if ( this._info.autoReset === true ) this._info.reset();

        _projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
        _frustum.setFromProjectionMatrix( _projScreenMatrix );

        this._currentRenderList = this._renderLists.get( scene, camera );
        this._currentRenderList.init();

        let lightsArray = [];
        let shadowsArray =[];
        this._overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;
        this._projectObject( scene, camera, 0,  lightsArray, shadowsArray);


        this._currentRenderList.finish();

        if ( this.sortObjects === true ) {

            this._currentRenderList.sort( this._opaqueSort, this._transparentSort );

        }

        // prepare render pass descriptor
        const colorAttachment = this._renderPassDescriptor.colorAttachments[ 0 ];
        const depthStencilAttachment = this._renderPassDescriptor.depthStencilAttachment;

        const renderTarget = this._renderTarget;

        if ( renderTarget !== null ) {

            // @TODO: Support RenderTarget with antialiasing.

            const renderTargetProperties = this._properties.get( renderTarget );

            colorAttachment.view = renderTargetProperties.colorTextureGPU.createView();
            depthStencilAttachment.view = renderTargetProperties.depthTextureGPU.createView();

        } else {

            if ( this._parameters.antialias === true ) {
                colorAttachment.view = this._colorBufferView;
                let swapChainTexture = this._context.getCurrentTexture();
                colorAttachment.resolveTarget = swapChainTexture.createView();

            } else {
                let swapChainTexture = this._context.getCurrentTexture();
                colorAttachment.view = swapChainTexture.createView();
                colorAttachment.resolveTarget = undefined;
            }

            depthStencilAttachment.view = this._depthBufferView;
        }

        //

        this._background.update( this._currentRenderList, scene );

        //
        const lightVersion = this._lights.version;
        this._lights.setup( lightsArray, false );
        this._lights.setupView( lightsArray, camera );
        if(lightVersion !== this._lights.version || !this._lightsShaderSource) {
            this._lightsShaderSource = this._shaderSources.getGraphShaderSource( this._sceneUniformsGroupObj, this._sceneUniformsGroupObj.material, this._lights, this._lights, scene, this);
        }
        // start render pass

        const device = this._device;
        //device.pushErrorScope('validation');
        const cmdEncoder = device.createCommandEncoder( {} );
        const passEncoder = cmdEncoder.beginRenderPass( this._renderPassDescriptor );

        // global rasterization settings for all renderable objects

        const vp = this._viewport;

        if ( vp !== null ) {

            const width = Math.floor( vp.width * this._pixelRatio );
            const height = Math.floor( vp.height * this._pixelRatio );

            passEncoder.setViewport( vp.x, vp.y, width, height, vp.minDepth, vp.maxDepth );

        }

        const sc = this._scissor;

        if ( sc !== null ) {

            const width = Math.floor( sc.width * this._pixelRatio );
            const height = Math.floor( sc.height * this._pixelRatio );

            passEncoder.setScissorRect( sc.x, sc.y, width, height );

        }

        this._updateSceneUniforms(scene);


        if ( camera.isArrayCamera ) {

            const cameras = camera.cameras;

            for ( let i = 0, l = cameras.length; i < l; i ++ ) {

                const camera2 = cameras[ i ];
                this._updateCameraUniforms(camera2);

                this._renderScene( this._currentRenderList, scene, camera2, passEncoder, camera2.viewport );

            }

        } else {

            this._updateCameraUniforms(camera);
            this._renderScene( this._currentRenderList, scene, camera, passEncoder );

        }

        // finish render pass

        passEncoder.end();
        device.queue.submit( [ cmdEncoder.finish() ] );
        // device.popErrorScope().then((error) => {
        //     if (error) {
        //         // There was an error creating the sampler, so discard it.
        //        console.error(error);
        //     }
        // });
        //
        return device.queue.onSubmittedWorkDone();
    }

    getContext() {

        return this._context;

    }

    getPixelRatio() {

        return this._pixelRatio;

    }

    getDrawingBufferSize( target ) {

        return target.set( this._width * this._pixelRatio, this._height * this._pixelRatio ).floor();

    }

    getSize( target ) {

        return target.set( this._width, this._height );

    }

    setPixelRatio( value = 1 ) {

        this._pixelRatio = value;

        this.setSize( this._width, this._height, false );

    }

    setDrawingBufferSize( width, height, pixelRatio ) {

        this._width = width;
        this._height = height;

        this._pixelRatio = pixelRatio;

        this.domElement.width = Math.floor( width * pixelRatio );
        this.domElement.height = Math.floor( height * pixelRatio );

        this._configureContext();
        this._setupColorBuffer();
        this._setupDepthBuffer();

    }

    setSize( width, height, updateStyle = true ) {

        debugger;
        this._width = width;
        this._height = height;

        this.domElement.width = Math.floor( width * this._pixelRatio );
        this.domElement.height = Math.floor( height * this._pixelRatio );

        if ( updateStyle === true ) {

            this.domElement.style.width = width + 'px';
            this.domElement.style.height = height + 'px';

        }

        this._configureContext();
        this._setupColorBuffer();
        this._setupDepthBuffer();
    }

    setOpaqueSort( method ) {

        this._opaqueSort = method;

    }

    setTransparentSort( method ) {

        this._transparentSort = method;

    }

    getScissor( target ) {

        const scissor = this._scissor;

        target.x = scissor.x;
        target.y = scissor.y;
        target.width = scissor.width;
        target.height = scissor.height;

        return target;
    }

    setScissor( x, y, width, height ) {

        if ( x === null ) {

            this._scissor = null;

        } else {

            this._scissor = {
                x: x,
                y: y,
                width: width,
                height: height
            };

        }

    }

    getViewport( target ) {

        const viewport = this._viewport;

        target.x = viewport.x;
        target.y = viewport.y;
        target.width = viewport.width;
        target.height = viewport.height;
        target.minDepth = viewport.minDepth;
        target.maxDepth = viewport.maxDepth;

        return target;

    }

    setViewport( x, y, width, height, minDepth = 0, maxDepth = 1 ) {

        if ( x === null ) {

            this._viewport = null;

        } else {

            this._viewport = {
                x: x,
                y: y,
                width: width,
                height: height,
                minDepth: minDepth,
                maxDepth: maxDepth
            };

        }

    }

    getCurrentEncoding() {

        const renderTarget = this.getRenderTarget();
        return ( renderTarget !== null ) ? renderTarget.texture.encoding : this.outputEncoding;

    }

    getCurrentColorFormat() {

        let format;

        const renderTarget = this.getRenderTarget();

        if ( renderTarget !== null ) {

            const renderTargetProperties = this._properties.get( renderTarget );
            format = renderTargetProperties.colorTextureFormat;

        } else {

            format = GPUTextureFormat.BGRA8Unorm; // default context format

        }

        return format;

    }

    getCurrentDepthStencilFormat() {

        let format;

        const renderTarget = this.getRenderTarget();

        if ( renderTarget !== null ) {

            const renderTargetProperties = this._properties.get( renderTarget );
            format = renderTargetProperties.depthTextureFormat;

        } else {

            format = GPUTextureFormat.Depth24PlusStencil8;

        }

        return format;

    }

    getClearColor( target ) {

        return target.copy( this._clearColor );

    }

    setClearColor( color, alpha = 1 ) {

        this._clearColor.set( color );
        this._clearAlpha = alpha;

    }

    getClearAlpha() {

        return this._clearAlpha;

    }

    setClearAlpha( alpha ) {

        this._clearAlpha = alpha;

    }

    getClearDepth() {

        return this._clearDepth;

    }

    setClearDepth( depth ) {

        this._clearDepth = depth;

    }

    getClearStencil() {

        return this._clearStencil;

    }

    setClearStencil( stencil ) {

        this._clearStencil = stencil;

    }

    clear() {

        this._background.clear();

    }

    dispose() {

        this._objects.dispose();
        this._properties.dispose();
        this._renderPipelines.dispose();
        this._shaderSources.dispose();
        this._bindings.dispose();
        this._info.dispose();
        this._renderLists.dispose();
        this._textures.dispose();

    }

    setRenderTarget( renderTarget ) {

        this._renderTarget = renderTarget;

        if ( renderTarget !== null ) {

            this._textures.initRenderTarget( renderTarget );

        }

    }

    getRenderTarget() {

        return this._renderTarget;

    }

}

WebGPURenderer.prototype.isWebGPURenderer = true;

export {WebGPURenderer};
