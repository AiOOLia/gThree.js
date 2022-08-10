export default /* wgsl */`
#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHT_SHADOWS > 0

		var directionalShadowMap: texture_2d_array<f32>;
		var directionalShadowMapSampler: sampler;
		var<in> vec4 vDirectionalShadowCoord: array<vec4<f32>, NUM_DIR_LIGHT_SHADOWS>;

		struct DirectionalLightShadow {
			shadowBias: f32;
			shadowNormalBias: f32;
			shadowRadius: f32;
			shadowMapSize: vec2<f32>;
		};

		var<uniform> directionalLightShadows: array<DirectionalLightShadow, NUM_DIR_LIGHT_SHADOWS>;

	#endif

	#if NUM_SPOT_LIGHT_SHADOWS > 0

		var spotShadowMap: texture_2d_array<f32>;
		var spotShadowMapSampler: sampler;
		var<in> vSpotShadowCoord: array<vec4<f32>, NUM_SPOT_LIGHT_SHADOWS>;

		struct SpotLightShadow {
			shadowBias: f32;
			shadowNormalBias: f32;
			shadowRadius: f32;
			shadowMapSize: vec2<f32>;
		};

		var<uniform> spotLightShadows: array<SpotLightShadow, NUM_SPOT_LIGHT_SHADOWS>;

	#endif

	#if NUM_POINT_LIGHT_SHADOWS > 0

		var pointShadowMa: texture_2d_array<f32>;
		var pointShadowMaSampler: sampler;
		var<in> vPointShadowCoord: array<vec4<f32>, NUM_POINT_LIGHT_SHADOWS>;

		struct PointLightShadow {
			shadowBias: f32;
			shadowNormalBias: f32;
			shadowRadius: f32;
			shadowMapSize: vec2<f32>;
			shadowCameraNear: f32;
			shadowCameraFar: f32;
		};

		var<uniform> pointLightShadows: array<PointLightShadow, NUM_POINT_LIGHT_SHADOWS>;

	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): create uniforms for area light shadows

	#endif
	*/

	fn texture2DCompare( depthMap: texture_2d<f32>, depthMapSampler: sampler, shadowIndex: i32, uv: vec2<f32>, compare: f32 )->f32 {

		return step( compare, unpackRGBAToDepth( textureSample( depthMap, depthMapSampler, uv, shadowIndex ) ) );

	}

	fn texture2DDistribution( shadowMap: texture_2d<f32>, shadowMapSampler: sampler, shadowIndex: i32, uv: vec2<f32> )->vec2<f32> {

		return unpackRGBATo2Half( textureSample( shadowMap, shadowMapSampler, uv, shadowIndex ) );

	}

	fn VSMShadow (shadowMap: texture_2d<f32>, shadowMapSampler: sampler, shadowIndex: i32, uv: vec2<f32>, compare: float )->f32 {

		let occlusion = 1.0;

		let distribution: vec2<f32> = texture2DDistribution( shadowMap, shadowMapSampler, shadowIndex, uv );

		let hard_shadow = step( compare , distribution.x ); // Hard Shadow

		if (hard_shadow != 1.0 ) {

			let distance = compare - distribution.x ;
			let variance = max( 0.00000, distribution.y * distribution.y );
		    var softness_probability = variance / (variance + distance * distance ); // Chebeyshevs inequality
			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 ); // 0.3 reduces light bleed
			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );

		}
		return occlusion;

	}

	fn getShadow( shadowMap: texture_2d_array<f32>, shadowMapSampler: sampler, shadowIndex: i32, shadowMapSize: vec2<f32>, shadowBias: f32, shadowRadius: f32, shadowCoord: vec4<f32> )->f32 {

		let shadow = 1.0;

		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;

		// if ( something && something ) breaks ATI OpenGL shader compiler
		// if ( all( something, something ) ) using this instead

		let inFrustumVec = vec4<bool> ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		let inFrustum = all( inFrustumVec );

		let frustumTestVec = vec2<bool>( inFrustum, shadowCoord.z <= 1.0 );

		let frustumTest = all( frustumTestVec );

		if ( frustumTest ) {

		#if defined( SHADOWMAP_TYPE_PCF )

			let texelSize = vec2<f32>( 1.0 ) / shadowMapSize;

			let dx0 = - texelSize.x * shadowRadius;
			let dy0 = - texelSize.y * shadowRadius;
			let dx1 = + texelSize.x * shadowRadius;
			let dy1 = + texelSize.y * shadowRadius;
			let dx2 = dx0 / 2.0;
			let dy2 = dy0 / 2.0;
			let dx3 = dx1 / 2.0;
			let dy3 = dy1 / 2.0;

			shadow = (
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );

		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )

			let texelSize = vec2<f32>( 1.0 ) / shadowMapSize;
			let dx = texelSize.x;
			let dy = texelSize.y;

			let uv: vec2<f32> = shadowCoord.xy;
			let f: vec<f32> = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;

			shadow = (
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( -dx, dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( dx, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( -dx, -dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );

		#elif defined( SHADOWMAP_TYPE_VSM )

			shadow = VSMShadow( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy, shadowCoord.z );

		#else // no percentage-closer filtering:

			shadow = texture2DCompare( shadowMap, shadowMapSampler, shadowIndex, shadowCoord.xy, shadowCoord.z );

		#endif

		}

		return shadow;

	}

	// cubeToUV() maps a 3D direction vector suitable for cube texture mapping to a 2D
	// vector suitable for 2D texture mapping. This code uses the following layout for the
	// 2D texture:
	//
	// xzXZ
	//  y Y
	//
	// Y - Positive y direction
	// y - Negative y direction
	// X - Positive x direction
	// x - Negative x direction
	// Z - Positive z direction
	// z - Negative z direction
	//
	// Source and test bed:
	// https://gist.github.com/tschw/da10c43c467ce8afd0c4

	fn cubeToUV( v: vec3<f32>, texelSizeY: f32 )->vec2<f32> {

		// Number of texels to avoid at the edge of each square

		var absV = abs( v );

		// Intersect unit cube

		let scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;

		// Apply scale to avoid seams

		// two texels less per square (one texel will do for NEAREST)
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );

		// Unwrap

		// space: -1 ... 1 range for each square
		//
		// #X##		dim    := ( 4 , 2 )
		//  # #		center := ( 1 , 1 )

		let planar: vec2<f32> = v.xy;

		let almostATexel = 1.5 * texelSizeY;
		let almostOne = 1.0 - almostATexel;

		if ( absV.z >= almostOne ) {

			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;

		} else if ( absV.x >= almostOne ) {

			let signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;

		} else if ( absV.y >= almostOne ) {

			let signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;

		}

		// Transform to UV space

		// scale := 0.5 / dim
		// translate := ( center + 0.5 ) / dim
		return vec2<f32>( 0.125, 0.25 ) * planar + vec2<f32>( 0.375, 0.75 );

	}

	fn getPointShadow( shadowMap: texture_2d<f32>, shadowMapSampler: sampler, shadowMapSize: vec2<f32>, shadowBias: f32, shadowRadius: f32, shadowCoord: vec4<f32>, shadowCameraNear: f32, shadowCameraFar: f32 )->f32 {

		let texelSize = vec2<f32>( 1.0 ) / ( shadowMapSize * vec2<f32>( 4.0, 2.0 ) );

		// for point lights, the uniform @vShadowCoord is re-purposed to hold
		// the vector from the light to the world-space position of the fragment.
		let lightToPosition: vec2<f32> = shadowCoord.xyz;

		// dp = normalized distance from light to fragment position
		let dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear ); // need to clamp?
		dp += shadowBias;

		// bd3D = base direction 3D
		let bd3D: vec3<f32> = normalize( lightToPosition );

		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )

			let offset: vec2<f32> = vec2( - 1, 1 ) * shadowRadius * texelSize.y;

			return (
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );

		#else // no percentage-closer filtering

			return texture2DCompare( shadowMap, shadowMapSampler, cubeToUV( bd3D, texelSize.y ), dp );

		#endif

	}

#endif
`;
