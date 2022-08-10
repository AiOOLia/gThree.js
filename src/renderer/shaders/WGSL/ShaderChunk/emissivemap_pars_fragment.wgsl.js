export default /* wgsl */`
#ifdef USE_EMISSIVEMAP

	var emissiveMap: texture_2d<f32>;
	var emissiveMapSampler: sampler;

#endif
`;
