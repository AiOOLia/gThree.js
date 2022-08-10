export default /* wgsl */`
#ifdef PREMULTIPLIED_ALPHA

	// Get get normal blending with premultipled, use with CustomBlending, OneFactor, OneMinusSrcAlphaFactor, AddEquation.
	frag_color.rgb *= frag_color.a;

#endif
`;
