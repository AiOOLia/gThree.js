export default /* wgsl */`
#ifdef USE_FOG

	var<uniform> fogColor: vec3<f32>;
	var<in> vFogDepth: f32;

	#ifdef FOG_EXP2

		var<uniform> fogDensity: f32;

	#else

		var<uniform> fogNear: f32;
		var<uniform> fogFar: f32;

	#endif

#endif
`;
