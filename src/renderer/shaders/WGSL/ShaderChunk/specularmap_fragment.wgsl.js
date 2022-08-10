export default /* wgsl */`
var specularStrength: f32;

#ifdef USE_SPECULARMAP

	let texelSpecular = textureSample( specularMap, specularMapSampler, vUv );
	specularStrength = texelSpecular.r;

#else

	specularStrength = 1.0;

#endif
`;
