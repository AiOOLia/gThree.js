export default /* wgsl */`
#ifdef USE_DISPLACEMENTMAP

	var displacementMap: texture_2d<f32>;
	var displacementMapSampler: sampler;
	var<uniform> displacementScale: f32;
	var<uniform> displacementBias: f32;

#endif
`;
