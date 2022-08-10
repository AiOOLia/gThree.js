export default /* wgsl */`
#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )

	var<in> vUv: vec2<f32>;

#endif
`;
