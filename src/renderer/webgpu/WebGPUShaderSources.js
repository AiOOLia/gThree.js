import {ShaderLib} from "../shaders/WGSL/ShaderLib";
import {UniformsUtils} from "../shaders/UniformsUtils";
import {
  BackSide,
  CubeUVReflectionMapping,
  DoubleSide, NoToneMapping,
  ObjectSpaceNormalMap, sRGBEncoding,
  TangentSpaceNormalMap
} from "three";
import {WebGPUShaderCache} from "./WebGPUShaderCache";
import {Layers} from "three";
import {WebGPUShaderSource} from "./WebGPUShaderSource";

class WebGPUShaderSources
{
    constructor() {

      const _programLayers = new Layers();
      const _customShaders = new WebGPUShaderCache();
      const _shaders = new Map();

      const shaderIDs = {
        MeshDepthMaterial: 'depth',
        MeshDistanceMaterial: 'distanceRGBA',
        MeshNormalMaterial: 'normal',
        MeshBasicMaterial: 'basic',
        MeshLambertMaterial: 'lambert',
        MeshPhongMaterial: 'phong',
        MeshToonMaterial: 'toon',
        MeshStandardMaterial: 'physical',
        MeshPhysicalMaterial: 'physical',
        MeshMatcapMaterial: 'matcap',
        LineBasicMaterial: 'basic',
        LineDashedMaterial: 'dashed',
        PointsMaterial: 'points',
        ShadowMaterial: 'shadow',
        SpriteMaterial: 'sprite'
      };

      function getMaxBones( object ) {
        const skeleton = object.skeleton;
        const bones = skeleton.bones;

        return 1024;
      }

      this.getParameters = ( renderer, material, lights, shadows, scene, object )=> {

        const environment = material.isMeshStandardMaterial ? scene.environment : null;

        //const envMap = ( material.isMeshStandardMaterial ? cubeuvmaps : cubemaps ).get( material.envMap || environment );
        const envMap = material.envMap || environment;
        const envMapCubeUVHeight = ( !! envMap ) && ( envMap.mapping === CubeUVReflectionMapping ) ? envMap.image.height : null;

        const shaderID = shaderIDs[ material.type ];

        const maxBones = object.isSkinnedMesh ? getMaxBones( object ) : 0;

        if ( material.precision !== null ) {
          //todo
        }

        let vertexShader, fragmentShader, uniforms;
        let customVertexShaderID, customFragmentShaderID;

        if ( shaderID ) {

          const shader = ShaderLib[ shaderID ];

          vertexShader = shader.vertexShader;
          fragmentShader = shader.fragmentShader;
          uniforms = UniformsUtils.clone(shader.uniforms);

        } else {

          vertexShader = material.vertexShader;
          fragmentShader = material.fragmentShader;
          uniforms = material.uniforms;

          _customShaders.update( material );

          customVertexShaderID = _customShaders.getVertexShaderID( material );
          customFragmentShaderID = _customShaders.getFragmentShaderID( material );
        }

        const currentRenderTarget = renderer.getRenderTarget();

        const useAlphaTest = material.alphaTest > 0;
        const useClearcoat = material.clearcoat > 0;

        const parameters = {
          shaderID: shaderID,
          shaderName: material.type,

          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          defines: material.defines ? material.defines : {},

          uniforms: uniforms,

          customVertexShaderID: customVertexShaderID,
          customFragmentShaderID: customFragmentShaderID,

          isRawShaderMaterial: material.isRawShaderMaterial === true,

          instancing: object.isInstancedMesh === true,
          instancingColor: object.isInstancedMesh === true && object.instanceColor !== null,
          numInstance: object.isInstancedMesh ? object.count : -1,

          outputEncoding: ( currentRenderTarget !== null ) ? currentRenderTarget.texture.encoding : renderer.outputEncoding,
          map: !! material.map,
          matcap: !! material.matcap,
          envMap: !! envMap,
          envMapMode: envMap && envMap.mapping,
          envMapCubeUVHeight: envMapCubeUVHeight,
          lightMap: !! material.lightMap,
          aoMap: !! material.aoMap,
          emissiveMap: !! material.emissiveMap,
          bumpMap: !! material.bumpMap,
          normalMap: !! material.normalMap,
          objectSpaceNormalMap: material.normalMapType === ObjectSpaceNormalMap,
          tangentSpaceNormalMap: material.normalMapType === TangentSpaceNormalMap,

          decodeVideoTexture: !! material.map && ( material.map.isVideoTexture === true ) && ( material.map.encoding === sRGBEncoding ),

          clearcoat: useClearcoat,
          clearcoatMap: useClearcoat && !! material.clearcoatMap,
          clearcoatRoughnessMap: useClearcoat && !! material.clearcoatRoughnessMap,
          clearcoatNormalMap: useClearcoat && !! material.clearcoatNormalMap,

          displacementMap: !! material.displacementMap,
          roughnessMap: !! material.roughnessMap,
          metalnessMap: !! material.metalnessMap,
          specularMap: !! material.specularMap,
          specularIntensityMap: !! material.specularIntensityMap,
          specularColorMap: !! material.specularColorMap,

          alphaMap: !! material.alphaMap,
          alphaTest: useAlphaTest,

          gradientMap: !! material.gradientMap,

          sheen: material.sheen > 0,
          sheenColorMap: !! material.sheenColorMap,
          sheenRoughnessMap: !! material.sheenRoughnessMap,

          transmission: material.transmission > 0,
          transmissionMap: !! material.transmissionMap,
          thicknessMap: !! material.thicknessMap,

          combine: material.combine,

          vertexTangents: ( !! material.normalMap && !! object.geometry && !! object.geometry.attributes.tangent ),
          vertexColors: material.vertexColors,
          vertexAlphas: material.vertexColors === true && !! object.geometry && !! object.geometry.attributes.color && object.geometry.attributes.color.itemSize === 4,
          vertexUvs: !! material.map || !! material.bumpMap || !! material.normalMap || !! material.specularMap || !! material.alphaMap || !! material.emissiveMap || !! material.roughnessMap || !! material.metalnessMap || !! material.clearcoatMap || !! material.clearcoatRoughnessMap || !! material.clearcoatNormalMap || !! material.displacementMap || !! material.transmissionMap || !! material.thicknessMap || !! material.specularIntensityMap || !! material.specularColorMap || !! material.sheenColorMap || !! material.sheenRoughnessMap,
          uvsVertexOnly: ! ( !! material.map || !! material.bumpMap || !! material.normalMap || !! material.specularMap || !! material.alphaMap || !! material.emissiveMap || !! material.roughnessMap || !! material.metalnessMap || !! material.clearcoatNormalMap || material.transmission > 0 || !! material.transmissionMap || !! material.thicknessMap || !! material.specularIntensityMap || !! material.specularColorMap || material.sheen > 0 || !! material.sheenColorMap || !! material.sheenRoughnessMap ) && !! material.displacementMap,

          fog: false,//!! fog,
          useFog: material.fog,
          fogExp2: false,//( fog && fog.isFogExp2 ),

          flatShading: !! material.flatShading,

          sizeAttenuation: material.sizeAttenuation,
          logarithmicDepthBuffer: false,//logarithmicDepthBuffer,

          skinning: object.isSkinnedMesh === true && maxBones > 0,
          maxBones: maxBones,
          //useVertexTexture: floatVertexTextures,

          morphTargets: !! object.geometry && !! object.geometry.morphAttributes.position,
          morphNormals: !! object.geometry && !! object.geometry.morphAttributes.normal,
          morphTargetsCount: ( !! object.geometry && !! object.geometry.morphAttributes.position ) ? object.geometry.morphAttributes.position.length : 0,

          numDirLights: lights.directional.length,
          numPointLights: lights.point.length,
          numSpotLights: lights.spot.length,
          numRectAreaLights: lights.rectArea.length,
          numHemiLights: lights.hemi.length,

          numDirLightShadows: lights.directionalShadowMap.length,
          numPointLightShadows: lights.pointShadowMap.length,
          numSpotLightShadows: lights.spotShadowMap.length,

          numClippingPlanes: 0,//clipping.numPlanes,
          numClipIntersection: 0,//clipping.numIntersection,

          format: material.format,
          dithering: material.dithering,

          shadowMapEnabled: false,//renderer.shadowMap.enabled && shadows.length > 0,
          //shadowMapType: renderer.shadowMap.type,

          toneMapping: NoToneMapping, //material.toneMapped ? renderer.toneMapping : NoToneMapping,
          //physicallyCorrectLights: renderer.physicallyCorrectLights,

          premultipliedAlpha: material.premultipliedAlpha,

          doubleSided: material.side === DoubleSide,
          flipSided: material.side === BackSide,

          depthPacking: ( material.depthPacking !== undefined ) ? material.depthPacking : false,

          index0AttributeName: material.index0AttributeName,

          customProgramCacheKey: material.customProgramCacheKey()
        };


        return parameters;
      }

      this.getShaderCacheKey = ( parameters, renderer )=> {

        const array = [];

        if ( parameters.shaderID ) {

          array.push( parameters.shaderID );

        } else {

          array.push( parameters.customVertexShaderID );
          array.push( parameters.customFragmentShaderID );

        }

        if ( parameters.defines !== undefined ) {

          for ( const name in parameters.defines ) {

            array.push( name );
            array.push( parameters.defines[ name ] );

          }

        }

        if ( renderer && parameters.isRawShaderMaterial === false ) {

          getShaderCacheKeyParameters( array, parameters );
          getShaderCacheKeyBooleans( array, parameters );
          array.push( renderer.outputEncoding );

        }

        if(parameters.customProgramCacheKey) {
          array.push( parameters.customProgramCacheKey );
        }

        return array.join();
      }

      function getShaderCacheKeyParameters( array, parameters ) {

        array.push( parameters.precision );
        array.push( parameters.outputEncoding );
        array.push( parameters.envMapMode );
        array.push( parameters.envMapCubeUVHeight );
        array.push( parameters.combine );
        array.push( parameters.vertexUvs );
        array.push( parameters.fogExp2 );
        array.push( parameters.sizeAttenuation );
        array.push( parameters.maxBones );
        array.push( parameters.morphTargetsCount );
        array.push( parameters.numDirLights );
        array.push( parameters.numPointLights );
        array.push( parameters.numSpotLights );
        array.push( parameters.numHemiLights );
        array.push( parameters.numRectAreaLights );
        array.push( parameters.numDirLightShadows );
        array.push( parameters.numPointLightShadows );
        array.push( parameters.numSpotLightShadows );
        array.push( parameters.shadowMapType );
        array.push( parameters.toneMapping );
        array.push( parameters.numClippingPlanes );
        array.push( parameters.numClipIntersection );
        array.push( parameters.numInstance );
        array.push( parameters.format );
      }

      function getShaderCacheKeyBooleans( array, parameters ) {

        _programLayers.disableAll();

        if ( parameters.isWebGL2 )
          _programLayers.enable( 0 );
        if ( parameters.supportsVertexTextures )
          _programLayers.enable( 1 );
        if ( parameters.instancing )
          _programLayers.enable( 2 );
        if ( parameters.instancingColor )
          _programLayers.enable( 3 );
        if ( parameters.map )
          _programLayers.enable( 4 );
        if ( parameters.matcap )
          _programLayers.enable( 5 );
        if ( parameters.envMap )
          _programLayers.enable( 6 );
        if ( parameters.lightMap )
          _programLayers.enable( 7 );
        if ( parameters.aoMap )
          _programLayers.enable( 8 );
        if ( parameters.emissiveMap )
          _programLayers.enable( 9 );
        if ( parameters.bumpMap )
          _programLayers.enable( 10 );
        if ( parameters.normalMap )
          _programLayers.enable( 11 );
        if ( parameters.objectSpaceNormalMap )
          _programLayers.enable( 12 );
        if ( parameters.tangentSpaceNormalMap )
          _programLayers.enable( 13 );
        if ( parameters.clearcoat )
          _programLayers.enable( 14 );
        if ( parameters.clearcoatMap )
          _programLayers.enable( 15 );
        if ( parameters.clearcoatRoughnessMap )
          _programLayers.enable( 16 );
        if ( parameters.clearcoatNormalMap )
          _programLayers.enable( 17 );
        if ( parameters.displacementMap )
          _programLayers.enable( 18 );
        if ( parameters.specularMap )
          _programLayers.enable( 19 );
        if ( parameters.roughnessMap )
          _programLayers.enable( 20 );
        if ( parameters.metalnessMap )
          _programLayers.enable( 21 );
        if ( parameters.gradientMap )
          _programLayers.enable( 22 );
        if ( parameters.alphaMap )
          _programLayers.enable( 23 );
        if ( parameters.alphaTest )
          _programLayers.enable( 24 );
        if ( parameters.vertexColors )
          _programLayers.enable( 25 );
        if ( parameters.vertexAlphas )
          _programLayers.enable( 26 );
        if ( parameters.vertexUvs )
          _programLayers.enable( 27 );
        if ( parameters.vertexTangents )
          _programLayers.enable( 28 );
        if ( parameters.uvsVertexOnly )
          _programLayers.enable( 39 );
        if ( parameters.fog )
          _programLayers.enable( 30 );

        array.push( _programLayers.mask );
        _programLayers.disableAll();

        if ( parameters.useFog )
          _programLayers.enable( 0 );
        if ( parameters.flatShading )
          _programLayers.enable( 1 );
        if ( parameters.logarithmicDepthBuffer )
          _programLayers.enable( 2 );
        if ( parameters.skinning )
          _programLayers.enable( 3 );
        if ( parameters.useVertexTexture )
          _programLayers.enable( 4 );
        if ( parameters.morphTargets )
          _programLayers.enable( 5 );
        if ( parameters.morphNormals )
          _programLayers.enable( 6 );
        if ( parameters.premultipliedAlpha )
          _programLayers.enable( 7 );
        if ( parameters.shadowMapEnabled )
          _programLayers.enable( 8 );
        if ( parameters.physicallyCorrectLights )
          _programLayers.enable( 9 );
        if ( parameters.doubleSided )
          _programLayers.enable( 10 );
        if ( parameters.flipSided )
          _programLayers.enable( 11 );
        if ( parameters.depthPacking )
          _programLayers.enable( 12 );
        if ( parameters.dithering )
          _programLayers.enable( 13 );
        if ( parameters.specularIntensityMap )
          _programLayers.enable( 14 );
        if ( parameters.specularColorMap )
          _programLayers.enable( 15 );
        if ( parameters.transmission )
          _programLayers.enable( 16 );
        if ( parameters.transmissionMap )
          _programLayers.enable( 17 );
        if ( parameters.thicknessMap )
          _programLayers.enable( 18 );
        if ( parameters.sheen )
          _programLayers.enable( 19 );
        if ( parameters.sheenColorMap )
          _programLayers.enable( 20 );
        if ( parameters.sheenRoughnessMap )
          _programLayers.enable( 21 );
        if ( parameters.decodeVideoTexture )
          _programLayers.enable( 22 );

        array.push( _programLayers.mask );
      }

      //
      this.getGraphShaderSource = (object, material, lights, shadows, scene, renderer)=> {
        const parameter = this.getParameters(renderer, material, lights, shadows, scene, object);
        const cacheKey = this.getShaderCacheKey(parameter, renderer);
        if(_shaders.has(cacheKey)) {
          if(!material.updateSceneUniforms ||
              (material.updateSceneUniforms && WebGPUShaderSource.sceneUniforms[scene.uuid])) {
            return _shaders.get(cacheKey);
          }
        }
        //
        let shader = new WebGPUShaderSource(cacheKey, parameter, scene.uuid, material.updateSceneUniforms);
        if(!_shaders.has(cacheKey)) {
          _shaders.set(cacheKey, shader);
          return shader;
        }
        //
        return _shaders.get(cacheKey);
      }


      this.getComputeShaderSource = (shaderDefine)=>{
        const parameter = {
          shaderID : _customShaders.getComputeShaderID( shaderDefine.computeShader ),
          shader: shaderDefine.computeShader,
          uniforms: shaderDefine.uniforms,
          isComputeShader: true
        }
        const cacheKey = this.getShaderCacheKey(parameter);
        if(_shaders.has(cacheKey)) {
            return _shaders.get(cacheKey);
        }
        //
        let shader = new WebGPUShaderSource(cacheKey, parameter);
        if(!_shaders.has(cacheKey)) {
          _shaders.set(cacheKey, shader);
          return shader;
        }
        //
        return _shaders.get(cacheKey);
      }

      this.releaseShaderSource = (shaderSource, material, onShaderSourceDispose)=>{
        if(shaderSource)
          --shaderSource.usedTimes;
        //
        if(material && material.isShaderMaterial) {
           _customShaders.remove(material);
           if(shaderSource.usedTimes < 1) {
             _shaders.delete(shaderSource.cacheKey);
           }
        }
        //
        if(shaderSource.usedTimes < 1) {
          if(onShaderSourceDispose){
            onShaderSourceDispose(shaderSource);
          }
        }
      }

      this.update = (object, lights, shadows, scene)=> {

      }
    }
}

export {WebGPUShaderSources};
