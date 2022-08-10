export default /* wgsl */`
#ifdef DITHERING

	frag_color.rgb = dithering( frag_color.rgb );

#endif
`;
