export default /* wgsl */`
#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHT_SHADOWS > 0

		var<uniform> directionalShadowMatrix: array<mat4x4<f32>, NUM_DIR_LIGHT_SHADOWS>;
		var<out> vDirectionalShadowCoord: array<vec4<f32>, NUM_DIR_LIGHT_SHADOWS>;

		struct DirectionalLightShadow {
			shadowBias: f32;
			shadowNormalBias: f32;
			shadowRadius: f32;
			shadowMapSize: vec2<f32>;
		};

		var<uniform> directionalLightShadows: array<DirectionalLightShadow, NUM_DIR_LIGHT_SHADOWS>;

	#endif

	#if NUM_SPOT_LIGHT_SHADOWS > 0

		var<uniform> spotShadowMatrix: array<mat4x4<f32>, NUM_SPOT_LIGHT_SHADOWS>;
		var<out> vSpotShadowCoord: array<vec4<f32>, NUM_SPOT_LIGHT_SHADOWS>;

		struct SpotLightShadow {
			shadowBias: f32;
			shadowNormalBias: f32;
			shadowRadius: f32;
			shadowMapSize: vec2<f32>;
		};

		var<uniform> spotLightShadows: array<SpotLightShadow, NUM_SPOT_LIGHT_SHADOWS>;

	#endif

	#if NUM_POINT_LIGHT_SHADOWS > 0

		var<uniform> pointShadowMatrix: array<mat4x4<f32>, NUM_POINT_LIGHT_SHADOWS>;
		var<out> vPointShadowCoord: array<vec4<f32>, NUM_POINT_LIGHT_SHADOWS>;

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

		// TODO (abelnation): uniforms for area light shadows

	#endif
	*/

#endif
`;
