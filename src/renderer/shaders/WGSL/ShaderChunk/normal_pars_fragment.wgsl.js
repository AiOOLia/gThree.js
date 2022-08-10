export default /* wgsl */`
#ifndef FLAT_SHADED

	var<in> vNormal: vec3<f32>;

	#ifdef USE_TANGENT

		var<in> vTangent: vec3<f32>;
		var<in> vBitangent: vec3<f32>;

	#endif

#endif
`;
