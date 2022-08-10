export default /* wgsl */`
#if defined( USE_LOGDEPTHBUF )

	var<uniform> logDepthBufFC: float;
	var<in> vFragDepth: f32;
	var<in> vIsPerspective: f32;

#endif
`;
