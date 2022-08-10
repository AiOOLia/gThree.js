export default /* wgsl */`
#ifdef USE_ALPHAMAP

	var alphaMap: texture_2d<f32>;
	var alphaMapSampler: sampler;

#endif
`;
