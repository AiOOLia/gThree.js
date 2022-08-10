export default /* wgsl */`
#if defined( USE_LOGDEPTHBUF )

	// Doing a strict comparison with == 1.0 can cause noise artifacts
	// on some platforms. See issue #17623.
	frag_depth = vIsPerspective == 0.0 ? frag_coord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;

#endif
`;
