import {
    ACESFilmicToneMapping, AddOperation,
    CineonToneMapping, CubeReflectionMapping, CubeRefractionMapping, CubeUVReflectionMapping, CustomToneMapping,
    LinearEncoding,
    LinearToneMapping, MixOperation, MultiplyOperation, NoToneMapping, PCFShadowMap, PCFSoftShadowMap,
    ReinhardToneMapping, RGBFormat,
    sRGBEncoding, VSMShadowMap
} from "three";
import {ShaderChunk} from "../shaders/WGSL/ShaderChunk";

function assembleShaderSource(shaderSource, parameters) {
    function filterEmptyLine( string ) {

        return string !== '';

    }

    function getEncodingComponents( encoding ) {

        switch ( encoding ) {

            case LinearEncoding:
                return [ 'Linear', '( value )' ];
            case sRGBEncoding:
                return [ 'sRGB', '( value )' ];
            default:
                console.warn( 'THREE.WebGLProgram: Unsupported encoding:', encoding );
                return [ 'Linear', '( value )' ];

        }

    }

    function getTexelEncodingFunction( functionName, encoding ) {
        const components = getEncodingComponents( encoding );
        return 'fn ' + functionName + '( value:vec4<f32> )->vec4<f32> { return LinearTo' + components[ 0 ] + components[ 1 ] + '; }';
    }

    function getToneMappingFunction( functionName, toneMapping ) {

        let toneMappingName;

        switch ( toneMapping ) {

            case LinearToneMapping:
                toneMappingName = 'Linear';
                break;

            case ReinhardToneMapping:
                toneMappingName = 'Reinhard';
                break;

            case CineonToneMapping:
                toneMappingName = 'OptimizedCineon';
                break;

            case ACESFilmicToneMapping:
                toneMappingName = 'ACESFilmic';
                break;

            case CustomToneMapping:
                toneMappingName = 'Custom';
                break;

            default:
                console.warn( 'THREE.WebGLProgram: Unsupported toneMapping:', toneMapping );
                toneMappingName = 'Linear';

        }

        return 'fn ' + functionName + '( color: vec3<f32> )->vec3<f32> { return ' + toneMappingName + 'ToneMapping( color ); }';
    }

    function generateShadowMapTypeDefine( parameters ) {

        let shadowMapTypeDefine = 'SHADOWMAP_TYPE_BASIC';

        if ( parameters.shadowMapType === PCFShadowMap ) {

            shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF';

        } else if ( parameters.shadowMapType === PCFSoftShadowMap ) {

            shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF_SOFT';

        } else if ( parameters.shadowMapType === VSMShadowMap ) {

            shadowMapTypeDefine = 'SHADOWMAP_TYPE_VSM';

        }

        return shadowMapTypeDefine;

    }

    function generateEnvMapTypeDefine( parameters ) {

        let envMapTypeDefine = 'ENVMAP_TYPE_CUBE';

        if ( parameters.envMap ) {

            switch ( parameters.envMapMode ) {

                case CubeReflectionMapping:
                case CubeRefractionMapping:
                    envMapTypeDefine = 'ENVMAP_TYPE_CUBE';
                    break;

                case CubeUVReflectionMapping:
                    envMapTypeDefine = 'ENVMAP_TYPE_CUBE_UV';
                    break;

            }

        }

        return envMapTypeDefine;

    }

    function generateEnvMapModeDefine( parameters ) {

        let envMapModeDefine = 'ENVMAP_MODE_REFLECTION';

        if ( parameters.envMap ) {

            switch ( parameters.envMapMode ) {

                case CubeRefractionMapping:

                    envMapModeDefine = 'ENVMAP_MODE_REFRACTION';
                    break;

            }

        }

        return envMapModeDefine;

    }

    function generateEnvMapBlendingDefine( parameters ) {

        let envMapBlendingDefine = 'ENVMAP_BLENDING_NONE';

        if ( parameters.envMap ) {

            switch ( parameters.combine ) {

                case MultiplyOperation:
                    envMapBlendingDefine = 'ENVMAP_BLENDING_MULTIPLY';
                    break;

                case MixOperation:
                    envMapBlendingDefine = 'ENVMAP_BLENDING_MIX';
                    break;

                case AddOperation:
                    envMapBlendingDefine = 'ENVMAP_BLENDING_ADD';
                    break;
            }
        }

        return envMapBlendingDefine;
    }
    //
    let prefixVertex, prefixFragment, prefixCompute;

    if ( parameters.isRawShaderMaterial ) {

        prefixVertex = [


        ].filter( filterEmptyLine ).join( '\n' );

        if ( prefixVertex.length > 0 ) {

            prefixVertex += '\n';

        }

        prefixFragment = [


        ].filter( filterEmptyLine ).join( '\n' );

        if ( prefixFragment.length > 0 ) {

            prefixFragment += '\n';

        }

    } else if(!parameters.isComputeShader) {

        prefixVertex = [
            ShaderChunk['extended_functions'],
            'var<uniform> modelMatrix: mat4x4<f32>;',
            'var<uniform> modelViewMatrix: mat4x4<f32>;',
            'var<uniform> projectionMatrix: mat4x4<f32>;',
            'var<uniform> viewMatrix: mat4x4<f32>;',
            'var<uniform> normalMatrix: mat3x3<f32>;',
            'var<uniform> cameraPosition: vec3<f32>;',
            'var<uniform> isOrthographic: i32;',

            '#ifdef USE_INSTANCING',

            '	var<storage, read> instanceMatrix: array<mat4x4<f32>, NUM_INSTANCE>;',

            '#endif',

            '#ifdef USE_INSTANCING_COLOR',

            '	var<storage, read> instanceColor: array<vec3<f32>, NUM_INSTANCE>;',

            '#endif',

            'var<in> position: vec3<f32>;',
            'var<in> normal: vec3<f32>;',
            '#ifdef USE_UV',
            'var<in> uv: vec2<f32>;',
            '#endif',

            '#ifdef USE_TANGENT',

            '	var<in> tangent: vec4<f32>;',

            '#endif',

            '#if defined( USE_COLOR_ALPHA )',

            '	var<in> color: vec4<f32>;',

            '#elif defined( USE_COLOR )',

            '	var<in> color: vec3<32>;',

            '#endif',

            '#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )',

            '	var<in> morphTarget0: vec3<f32>;',
            '	var<in> morphTarget1: vec3<f32>;',
            '	var<in> morphTarget2: vec3<f32>;',
            '	var<in> morphTarget3: vec3<f32>;',

            '	#ifdef USE_MORPHNORMALS',

            '		var<in> morphNormal0: vec3<f32>;',
            '		var<in> morphNormal1: vec3<f32>;',
            '		var<in> morphNormal2: vec3<f32>;',
            '		var<in> morphNormal3: vec3<f32>;',

            '	#else',

            '		var<in> morphTarget4: vec3<f32>;',
            '		var<in> morphTarget5: vec3<f32>;',
            '		var<in> morphTarget6: vec3<f32>;',
            '		var<in> morphTarget7: vec3<f32>;',

            '	#endif',

            '#endif',

            '#ifdef USE_SKINNING',

            '	var<in> skinIndex: vec4<f32>;',
            '	var<in> skinWeight: vec4<f32>;',

            '#endif',

            '\n@CustomStructs\n@UniformStruct\n@VertexInStruct\n@VertexOutStruct\n'

        ].filter( filterEmptyLine ).join( '\n' );

        prefixFragment = [
            ShaderChunk['extended_functions'],
            'var<uniform> viewMatrix: mat4x4<f32>;',
            'var<uniform> cameraPosition: vec3<f32>;',
            'var<uniform> isOrthographic: i32;',

            ( parameters.toneMapping !== NoToneMapping ) ? ShaderChunk[ 'tonemapping_pars_fragment' ] : '', // this code is required here because it is used by the toneMapping() function defined below
            ( parameters.toneMapping !== NoToneMapping ) ? getToneMappingFunction( 'toneMapping', parameters.toneMapping ) : '',

            ShaderChunk[ 'encodings_pars_fragment' ], // this code is required here because it is used by the various encoding/decoding function defined below
            getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputEncoding ),

            '\n@CustomStructs\n@UniformStruct\n@FragmentInStruct\n@FragmentOutStruct\n'
        ].filter( filterEmptyLine ).join( '\n' );

    } else {
        prefixCompute =  '@CustomStructs\n@UniformStruct\n';
    }

    // Preprocessor
    const preprocessorSymbols = /#([^\s]*)(\s*)/gm;
    function processor(string, defines, str_defines, replaces) {
        str_defines += '\nconst defined = (T)=>{ return !!(T); };'
        //
        const matchedSymbols = string.matchAll(preprocessorSymbols);
        let lastIndex = 0;
        const stateStack = [];
        let state = { string: '', elseIsValid: false, expression: true };
        let depth = 1;
        let skip_else = false;
        //
        for (const match of matchedSymbols) {
            if(!skip_else && match.index > lastIndex) {
                state.string += string.substring(lastIndex, match.index).trimRight();
            }
            //state.string = state.string.trim();
            //
            if(match[1] === 'ifdef') {
                if(!skip_else) {
                    let index = match.index;
                    let define = '';
                    while(string[index] !== '\n') {
                        define += string[index++];
                    }
                    lastIndex = index;
                    //
                    stateStack.push(state);
                    //
                    let expression = define.substr(match[0].length, define.length - match[0].length);
                    expression = expression.trim();
                    let func_check = new Function(str_defines + "\nreturn " + expression + " !==0;");
                    state = { string: '', elseIsValid: true, expression: !!func_check() };
                }
                //
                depth++;
            } else if(match[1] === 'ifndef') {
                if(!skip_else) {
                    let index = match.index;
                    let define = '';
                    while(string[index] !== '\n') {
                        define += string[index++];
                    }
                    lastIndex = index;
                    //
                    stateStack.push(state);
                    //
                    let expression = define.substr(match[0].length, define.length - match[0].length);
                    expression = expression.trim();
                    let func_check = new Function(str_defines + "\nreturn " + expression + " ===0;");
                    state = { string: '', elseIsValid: true, expression: !!func_check() };
                }
                //
                depth++;
            } else if(match[1] === 'if') {
                if(!skip_else) {
                    let index = match.index;
                    let define = '';
                    while(string[index] !== '\n') {
                        define += string[index++];
                    }
                    lastIndex = index;
                    //
                    stateStack.push(state);
                    //
                    let expression = define.substr(match[0].length, define.length - match[0].length);
                    expression = expression.trim();
                    let func_check = new Function(str_defines + "\nreturn " + expression + ";");
                    state = { string: '', elseIsValid: true, expression: !!func_check() };
                }
                //
                depth++;
            } else if(match[1] === 'elif') {
                if (!skip_else && !state.elseIsValid) {
                    throw new Error('#else not preceeded by an #if or #elif');
                    break;
                }
                if (!skip_else && state.expression && depth - stateStack.length === 1) {
                    stateStack.push(state);
                    skip_else = true;
                }
                //
                if(!skip_else) {
                    let index = match.index;
                    let define = '';
                    while(string[index] !== '\n') {
                        define += string[index++];
                    }
                    lastIndex = index;
                    //
                    let expression = define.substr(match[0].length, define.length - match[0].length);
                    expression = expression.trim();
                    let func_check = new Function(str_defines + "\nreturn " + expression + ";");
                    state = { string: '\n', elseIsValid: true, expression: !!func_check() };
                } else {
                    state = { string: '', elseIsValid: true, expression: !state.expression };
                    //
                    lastIndex = match.index + match[0].length;
                }
            } else if(match[1] === 'else') {
                if (!skip_else && !state.elseIsValid) {
                    throw new Error('#else not preceeded by an #if or #elif');
                    break;
                }
                if (!skip_else && state.expression && depth - stateStack.length === 1) {
                    stateStack.push(state);
                    skip_else = true;
                }
                //
                state = { string: !skip_else ? '\n' : '', elseIsValid: false, expression: !state.expression };
                //
                lastIndex = match.index + match[0].length;
            } else if(match[1] === 'define') {
                let index = match.index + match[0].length;
                let define = '';
                while(string[index] !== '\n') {
                    define += string[index++];
                }
                lastIndex = index;
                define = define.trim();
                if(!skip_else && state.expression) {
                    let replaceDefine = define.split(/[\s\t]/);
                    if(replaceDefine.length > 1) {
                        let replaceName = replaceDefine[0].trim();
                        let replaceValue = replaceDefine[replaceDefine.length-1].trim();
                        if(replaceName[replaceName.length-1] === '(') {
                            let ii = 1;
                            while(replaceDefine[ii][replaceDefine[ii].length-1] !== ')') {
                                if(replaceDefine[ii].length > 0) {
                                    replaceName += '[\\s\\t]*' + replaceDefine[ii];
                                }
                                ++ii;
                            }
                            replaceName += '[\\s\\t]*' + replaceDefine[ii];
                            //
                            replaceValue = '';
                            ++ii;
                            while(ii < replaceDefine.length) {
                                replaceValue += replaceDefine[ii++];
                            }
                            replaceValue = replaceValue.trim();
                        } else {
                            if(defines.has(replaceName)) {
                                str_defines += '\n' + replaceName + ' = 1;\n';
                            } else {
                                str_defines += '\nlet ' + replaceName + ' = 1;\n';
                            }
                        }
                        //
                        replaces.set(replaceName, replaceValue);
                    }
                    else if(defines.has(define)) {
                        str_defines += '\n' + define + ' = 1;\n';
                    } else {
                        str_defines += '\nlet ' + define + ' = 1;\n';
                    }
                }
            } else if(match[1] === 'endif') {
                if(skip_else && depth === stateStack.length) {
                    skip_else = false;
                }
                //
                if(!skip_else) {
                    if (!stateStack.length) {
                        throw new Error('#endif not preceeded by an #if');
                        break;
                    }
                    const branchState = stateStack.length === depth ? stateStack.pop() : state;
                    state = stateStack.pop();
                    if (branchState.expression) {
                        state.string += branchState.string;
                    }
                    state.string += match[2];
                }
                depth--;
                //
                lastIndex = match.index + match[0].length;
            }
        }
        //
        if(lastIndex <= string.length - 1) {
            state.string += string.substring(lastIndex, string.length);
        }
        return state.string;
    };

    function replaceLightNums( string, parameters ) {

        return string
            .replace( /NUM_DIR_LIGHTS/g, parameters.numDirLights )
            .replace( /NUM_SPOT_LIGHTS/g, parameters.numSpotLights )
            .replace( /NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights )
            .replace( /NUM_POINT_LIGHTS/g, parameters.numPointLights )
            .replace( /NUM_HEMI_LIGHTS/g, parameters.numHemiLights )
            .replace( /NUM_DIR_LIGHT_SHADOWS/g, parameters.numDirLightShadows )
            .replace( /NUM_SPOT_LIGHT_SHADOWS/g, parameters.numSpotLightShadows )
            .replace( /NUM_POINT_LIGHT_SHADOWS/g, parameters.numPointLightShadows );

    }

    function replaceClippingPlaneNums( string, parameters ) {

        return string
            .replace( /NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes )
            .replace( /UNION_CLIPPING_PLANES/g, ( parameters.numClippingPlanes - parameters.numClipIntersection ) );

    }

    function replaceInstanceNums(string, parameters) {
        if(parameters.numInstance > -1) {
            return string.replace(/NUM_INSTANCE/g, parameters.numInstance);
        }
        return string;
    }

    function removeComments(source) {
        // remove inline comments
        source = source.replace(/\/\/.*/g, "");
        // remove multiline comment block
        return source.replace(/\/\*\*[\s\S]*?\*\//gm, function (match) {
            // preserve the number of lines in the comment block so the line numbers will be correct when debugging shaders
            var numberOfLines = match.match(/\n/gm).length;
            var replacement = "";
            for (var lineNumber = 0; lineNumber < numberOfLines; ++lineNumber) {
                replacement += "\n";
            }
            return replacement;
        });
    }

    // Resolve Includes
    const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

    function resolveIncludes( string ) {

        return string.replace( includePattern, includeReplacer );

    }

    function includeReplacer( match, include ) {

        const string = ShaderChunk[ include ];

        if ( string === undefined ) {

            throw new Error( 'Can not resolve #include <' + include + '>' );

        }

        return resolveIncludes( string );

    }

    // Unroll Loops

    const deprecatedUnrollLoopPattern = /#pragma unroll_loop[\s]+?for \( var i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g;
    const unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*var\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;

    function unrollLoops( string ) {

        return string
            .replace( unrollLoopPattern, loopReplacer )
            .replace( deprecatedUnrollLoopPattern, deprecatedLoopReplacer );

    }

    function deprecatedLoopReplacer( match, start, end, snippet ) {

        console.warn( 'WebGLProgram: #pragma unroll_loop shader syntax is deprecated. Please use #pragma unroll_loop_start syntax instead.' );
        return loopReplacer( match, start, end, snippet );

    }

    function loopReplacer( match, start, end, snippet ) {

        let string = '';

        for ( let i = parseInt( start ); i < parseInt( end ); i ++ ) {

            string += snippet
                .replace( /\[\s*i\s*\]/g, '[ ' + i + ' ]' )
                .replace( /UNROLLED_LOOP_INDEX/g, i );

        }

        return string;
    }

    let defines = new Map();

    if(!parameters.isComputeShader) {
        const defines_ = [
            'USE_INSTANCING','USE_INSTANCING_COLOR','VERTEX_TEXTURES', 'MAX_BONES',
            'USE_FOG','FOG_EXP2','USE_MAP','USE_ENVMAP','ENVMAP_MODE_REFLECTION', 'ENVMAP_MODE_REFRACTION',
            'USE_LIGHTMAP','USE_AOMAP','USE_EMISSIVEMAP','USE_BUMPMAP','USE_NORMALMAP', 'OBJECTSPACE_NORMALMAP',
            'TANGENTSPACE_NORMALMAP', 'ENVMAP_TYPE_CUBE', 'ENVMAP_TYPE_CUBE_UV','SHADOWMAP_TYPE_BASIC','SHADOWMAP_TYPE_PCF', 'ENV_WORLDPOS',
            'SHADOWMAP_TYPE_PCF_SOFT', 'SHADOWMAP_TYPE_VSM', 'USE_CLEARCOAT', 'USE_CLEARCOATMAP', 'USE_CLEARCOAT_ROUGHNESSMAP', 'USE_CLEARCOAT_NORMALMAP',
            'ENVMAP_BLENDING_NONE', 'ENVMAP_BLENDING_MULTIPLY', 'ENVMAP_BLENDING_MIX', 'ENVMAP_BLENDING_ADD',
            'USE_DISPLACEMENTMAP', 'USE_SPECULARMAP', 'USE_SPECULARINTENSITYMAP', 'USE_SPECULARCOLORMAP', 'NUM_CLIPPING_PLANES',
            'USE_ROUGHNESSMAP', 'USE_METALNESSMAP', 'USE_ALPHAMAP', 'USE_ALPHATEST', 'USE_TRANSMISSION', 'USE_TRANSMISSIONMAP', 'TONE_MAPPING',
            'USE_THICKNESSMAP', 'DECODE_VIDEO_TEXTURE', 'USE_SHEEN', 'USE_SHEENCOLORMAP', 'USE_SHEENROUGHNESSMAP', 'USE_TANGENT', 'USE_COLOR',
            'USE_COLOR_ALPHA', 'USE_UV', 'UVS_VERTEX_ONLY', 'FLAT_SHADED', 'USE_SKINNING', 'BONE_TEXTURE',
            'USE_MORPHTARGETS', 'USE_MORPHNORMALS', 'MORPHTARGETS_TEXTURE', 'MORPHTARGETS_COUNT', 'DOUBLE_SIDED',
            'FLIP_SIDED', 'USE_SHADOWMAP', 'USE_SIZEATTENUATION', 'PREMULTIPLIED_ALPHA', 'PHYSICALLY_CORRECT_LIGHTS', 'USE_LOGDEPTHBUF',
            'PHONG', 'DISTANCE', 'LAMBERT', 'MATCAP', 'NORMAL', 'STANDARD', 'TOON', 'DITHERING', 'OPAQUE', 'RE_Direct', 'RE_Direct_RectArea', 'RE_IndirectDiffuse',
            'RE_IndirectSpecular'
        ];

        for(let i=0, ln = defines_.length; i<ln; ++i) {
            defines.set(defines_[i], 0);
        }
        //
        const shadowMapTypeDefine = generateShadowMapTypeDefine( parameters );
        const envMapTypeDefine = generateEnvMapTypeDefine( parameters );
        const envMapModeDefine = generateEnvMapModeDefine( parameters );
        const envMapBlendingDefine = generateEnvMapBlendingDefine( parameters );


        if(parameters.instancing) defines.set('USE_INSTANCING', 1);
        if(parameters.instancingColor) defines.set('USE_INSTANCING_COLOR', 1);

        if(parameters.supportsVertexTextures) defines.set('VERTEX_TEXTURES', 1);

        defines.set('MAX_BONES', parameters.maxBones);
        if( parameters.useFog && parameters.fog ) defines.set('USE_FOG', 1);
        if( parameters.useFog && parameters.fogExp2 ) defines.set('FOG_EXP2', 1);

        if(parameters.map) defines.set('USE_MAP', 1);
        if(parameters.matcap) defines.set('USE_MAPCAP', 1);
        if(parameters.envMap) defines.set('USE_ENVMAP', 1);
        if(parameters.envMap) defines.set(envMapTypeDefine, 1);
        if(parameters.envMap) defines.set(envMapModeDefine, 1);
        if(parameters.envMap) defines.set(envMapBlendingDefine, 1);
        if(parameters.lightMap) defines.set('USE_LIGHTMAP', 1);
        if(parameters.aoMap) defines.set('USE_AOMAP', 1);
        if(parameters.emissiveMap) defines.set('USE_EMISSIVEMAP', 1);
        if(parameters.bumpMap) defines.set('USE_BUMPMAP', 1);
        if(parameters.normalMap) defines.set('USE_NORMALMAP', 1);
        if(parameters.normalMap && parameters.objectSpaceNormalMap) defines.set('OBJECTSPACE_NORMALMAP', 1);
        if(parameters.normalMap && parameters.tangentSpaceNormalMap) defines.set('TANGENTSPACE_NORMALMAP', 1);


        if(parameters.clearcoat) defines.set('USE_CLEARCOAT', 1);
        if(parameters.clearcoatMap) defines.set('USE_CLEARCOATMAP', 1);
        if(parameters.clearcoatRoughnessMap) defines.set('USE_CLEARCOAT_ROUGHNESSMAP', 1);
        if(parameters.clearcoatNormalMap) defines.set('USE_CLEARCOAT_NORMALMAP', 1);

        if(parameters.displacementMap && parameters.supportsVertexTextures) defines.set('USE_DISPLACEMENTMAP', 1);

        if(parameters.specularMap) defines.set('USE_SPECULARMAP', 1);
        if(parameters.specularIntensityMap) defines.set('USE_SPECULARINTENSITYMAP', 1);
        if(parameters.specularColorMap) defines.set('USE_SPECULARCOLORMAP', 1);

        if(parameters.roughnessMap) defines.set('USE_ROUGHNESSMAP', 1);
        if(parameters.metalnessMap) defines.set('USE_METALNESSMAP', 1);
        if(parameters.alphaMap) defines.set('USE_ALPHAMAP', 1);
        if(parameters.alphaTest) defines.set('USE_ALPHATEST', 1);

        if(parameters.transmission) defines.set('USE_TRANSMISSION', 1);
        if(parameters.transmissionMap) defines.set('USE_TRANSMISSIONMAP', 1);
        if(parameters.thicknessMap) defines.set('USE_THICKNESSMAP', 1);

        if(parameters.decodeVideoTexture) defines.set('DECODE_VIDEO_TEXTURE', 1);

        if(parameters.sheen) defines.set('USE_SHEEN', 1);
        if(parameters.sheenColorMap) defines.set('USE_SHEENCOLORMAP', 1);
        if(parameters.sheenRoughnessMap) defines.set('USE_SHEENROUGHNESSMAP', 1);

        if(parameters.vertexTangents) defines.set('USE_TANGENT', 1);
        if(parameters.vertexColors) defines.set('USE_COLOR', 1);
        if(parameters.vertexAlphas) defines.set('USE_COLOR_ALPHA', 1);
        if(parameters.vertexUvs) defines.set('USE_UV', 1);
        if(parameters.uvsVertexOnly) defines.set('UVS_VERTEX_ONLY', 1);

        if(parameters.flatShading) defines.set('FLAT_SHADED', 1);

        if(parameters.skinning) defines.set('USE_SKINNING', 1);
        if(parameters.useVertexTexture) defines.set('BONE_TEXTURE', 1);

        if(parameters.morphTargets) defines.set('USE_MORPHTARGETS', 1);
        if(parameters.morphNormals && parameters.flatShading === false) defines.set('USE_MORPHNORMALS', 1);
        if(parameters.morphTargets) defines.set('MORPHTARGETS_TEXTURE', 1);
        if(parameters.morphTargets) defines.set('MORPHTARGETS_COUNT',  parameters.morphTargetsCount);
        if(parameters.doubleSided) defines.set('DOUBLE_SIDED', 1);
        if(parameters.flipSided) defines.set('FLIP_SIDED', 1);

        if(parameters.shadowMapEnabled) defines.set('USE_SHADOWMAP', 1);
        if(parameters.shadowMapEnabled) defines.set(shadowMapTypeDefine, 1);

        if(parameters.sizeAttenuation) defines.set('USE_SIZEATTENUATION', 1);


        if(parameters.premultipliedAlpha) defines.set('PREMULTIPLIED_ALPHA', 1);

        if(parameters.physicallyCorrectLights) defines.set('PHYSICALLY_CORRECT_LIGHTS', 1);

        if(parameters.logarithmicDepthBuffer) defines.set('USE_LOGDEPTHBUF', 1);

        if(parameters.dithering) defines.set('DITHERING', 1);
        if(parameters.format === RGBFormat) defines.set('OPAQUE', 1);

        if(parameters.toneMapping !== NoToneMapping) defines.set('TONE_MAPPING', 1);
        //
        shaderSource.vertexShader = resolveIncludes(parameters.vertexShader);
        shaderSource.fragmentShader = resolveIncludes(parameters.fragmentShader);

        shaderSource.vertexShader = removeComments(shaderSource.vertexShader);
        shaderSource.fragmentShader = removeComments(shaderSource.fragmentShader);

        shaderSource.vertexShader = replaceLightNums(shaderSource.vertexShader, parameters);
        shaderSource.fragmentShader = replaceLightNums(shaderSource.fragmentShader, parameters);

        shaderSource.vertexShader = replaceClippingPlaneNums(shaderSource.vertexShader, parameters);
        shaderSource.fragmentShader = replaceClippingPlaneNums(shaderSource.fragmentShader, parameters);

        shaderSource.vertexShader = unrollLoops( shaderSource.vertexShader );
        shaderSource.fragmentShader = unrollLoops( shaderSource.fragmentShader );

        shaderSource.vertexShader = prefixVertex + shaderSource.vertexShader;
        shaderSource.fragmentShader = prefixFragment + shaderSource.fragmentShader;

        shaderSource.vertexShader = replaceInstanceNums(shaderSource.vertexShader, parameters);
        shaderSource.fragmentShader = replaceInstanceNums(shaderSource.fragmentShader, parameters);

        let str_defines = '';
        defines.forEach((value, key, map)=>{
            str_defines += 'let ' + key + ' = ' + value + ';\n';
        });
        let replaces = new Map();
        shaderSource.vertexShader = processor(shaderSource.vertexShader, defines, str_defines, replaces);
        replaces.forEach((value, key, map)=>{
            const re = new RegExp('[\\W]{1}' + key +'[\\W]{1}', 'g');
            shaderSource.vertexShader = shaderSource.vertexShader.replace(re, (match)=>{
                return match[0] +  value + match[match.length-1];
            });
        });
        replaces.clear();
        shaderSource.fragmentShader = processor(shaderSource.fragmentShader, defines, str_defines, replaces);
        replaces.forEach((value, key, map)=>{
            const re = new RegExp('[\\W]{1}' + key +'[\\W]{1}', 'g');
            shaderSource.fragmentShader= shaderSource.fragmentShader.replace(re, (match)=>{
                return match[0] +  value + match[match.length-1];
            });
        });
    } else {
        shaderSource.computeShader = resolveIncludes(shaderSource.computeShader);

        shaderSource.computeShader = removeComments(shaderSource.computeShader);

        shaderSource.computeShader = unrollLoops( shaderSource.computeShader );

        shaderSource.computeShader = prefixCompute + shaderSource.computeShader;

        if(defines.size > 0) {
            let str_defines = '';
            defines.forEach((value, key, map)=>{
                str_defines += 'let ' + key + ' = ' + value + ';\n';
            });
            let replaces = new Map();
            shaderSource.computeShader = processor(shaderSource.computeShader, defines, str_defines, replaces);
            replaces.forEach((value, key, map)=>{
                const re = new RegExp('[\\W]{1}' + key +'[\\W]{1}', 'g');
                shaderSource.computeShader = shaderSource.computeShader.replace(re, (match)=>{
                    return match[0] +  value + match[match.length-1];
                });
            });
        }
    }
}

export {assembleShaderSource}
