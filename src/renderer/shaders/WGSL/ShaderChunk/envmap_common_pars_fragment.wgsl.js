export default /* wgsl */`
#ifdef USE_ENVMAP

	var<uniform> envMapIntensity: f32;
	var<uniform> flipEnvMap: f32;

	#ifdef ENVMAP_TYPE_CUBE
		var envMap: texture_cube<f32>;
	#else
		var envMap: texture_2d<f32>;
	#endif
	var envMapSampler: sampler;
	
#endif
`;
