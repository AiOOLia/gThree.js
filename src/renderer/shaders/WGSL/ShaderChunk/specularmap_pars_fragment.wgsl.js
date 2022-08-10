export default /* wgsl */`
#ifdef USE_SPECULARMAP

	var specularMap: texture_2d<f32>;
	var specularMapSampler: sampler;

#endif
`;
