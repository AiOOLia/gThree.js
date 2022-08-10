export default /* wgsl */`
#ifdef USE_LOGDEPTHBUF

	var<out> vFragDepth: f32;
	var<out> vIsPerspective: f32;

#endif
`;
