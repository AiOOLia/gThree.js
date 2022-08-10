export default /* wgsl */`
#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )

	var<in> uv2: vec2<f32>;
	var<out> vUv2: vec2<f32>;

	var<uniform> uv2Transform: mat3x3<f32>;

#endif
`;
