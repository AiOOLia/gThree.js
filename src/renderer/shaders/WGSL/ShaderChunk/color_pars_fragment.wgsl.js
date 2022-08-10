export default /* wgsl */`
#if defined( USE_COLOR_ALPHA )

	var<in> vColor: vec4<f32>;

#elif defined( USE_COLOR )

	var<in> vColor: vec3<f32>;

#endif
`;
