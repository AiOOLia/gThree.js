export default /* wgsl */`
#ifdef USE_ENVMAP

	var<uniform> reflectivity: f32;

	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )

		#define ENV_WORLDPOS

	#endif

	#ifdef ENV_WORLDPOS

		var<in> vWorldPosition: vec3<f32>;
		var<uniform> refractionRatio: f32;
	#else
		var<in> vReflect: vec3<f32>;
	#endif

#endif
`;
