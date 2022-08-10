export default /* wgsl */`
#ifdef USE_UV

	#ifdef UVS_VERTEX_ONLY

		var vUv: vec2<f32>;

	#else

		 var<out> vUv: vec2<f32>;

	#endif

	var<uniform> uvTransform: mat3x3<f32>;

#endif
`;
