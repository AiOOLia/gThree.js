export default /* wgsl */`
#ifdef USE_AOMAP

	var aoMap: texture_2d<f32>;
	var aoMapSampler: sampler;
	var<uniform> aoMapIntensity: f32;

#endif
`;
