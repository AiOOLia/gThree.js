export default /* wgsl */`
#if defined( TONE_MAPPING )

	frag_color.rgb = toneMapping( frag_color.rgb );

#endif
`;
