export default /* wgsl */`
#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

	vUv2 = ( uv2Transform * vec3<f32>( uv2, 1.0 ) ).xy;

#endif
`;
