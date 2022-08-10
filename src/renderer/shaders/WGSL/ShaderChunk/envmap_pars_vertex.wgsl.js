export default /* wgsl */`
#ifdef USE_ENVMAP

	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )

		#define ENV_WORLDPOS

	#endif

	#ifdef ENV_WORLDPOS
		
		var<out> vWorldPosition: vec3<f32>;
	#else

		var<out> vReflect: vec3<f32>;
		var<uniform> refractionRatio: f32;

	#endif

#endif
`;
