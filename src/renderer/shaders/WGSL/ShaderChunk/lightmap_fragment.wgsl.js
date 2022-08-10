export default /* wgsl */`
#ifdef USE_LIGHTMAP

	let lightMapTexel = textureSample( lightMap, lightMapSampler, vUv2 );
	var lightMapIrradiance: vec3<f32> = lightMapTexel.rgb * lightMapIntensity;

	#ifndef PHYSICALLY_CORRECT_LIGHTS

		lightMapIrradiance *= PI;

	#endif

	reflectedLight.indirectDiffuse += lightMapIrradiance;

#endif
`;
