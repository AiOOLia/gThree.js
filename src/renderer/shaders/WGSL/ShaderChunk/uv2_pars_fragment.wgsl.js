export default /* wgsl */`
#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

	var<in> vUv2: vec2<f32>;

#endif
`;
