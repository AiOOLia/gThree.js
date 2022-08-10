export default /* glsl */`
#ifdef USE_LIGHTMAP

	var lightMap: texture_2d<f32>;
	var lightMapSampler: sampler;
	var<uniform> lightMapIntensity: f32;

#endif
`;
