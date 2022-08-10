export default /* wgsl */`
#if defined( USE_COLOR_ALPHA )

	var<out> vColor: vec4<f32>;

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )

	var<out> vColor: vec3<f32>;

#endif
`;
