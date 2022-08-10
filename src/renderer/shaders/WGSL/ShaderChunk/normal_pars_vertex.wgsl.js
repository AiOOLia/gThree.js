export default /* wgsl */`
#ifndef FLAT_SHADED

	var<out> vNormal: vec3<f32>;

	#ifdef USE_TANGENT

		var<out> vTangent: vec3<f32>;
		var<out> vBitangent: vec3<f32>;

	#endif

#endif
`;
