export default /* wgsl */`
#ifdef USE_EMISSIVEMAP

	let emissiveColor: vec4<f32> = texture2D( emissiveMap, vUv );

	totalEmissiveRadiance *= emissiveColor.rgb;

#endif
`;
