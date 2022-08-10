export default /* wgsl */`
#ifdef USE_SKINNING

	var skinMatrix = mat4x4<f32>( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;

	objectNormal = vec4<f32>( skinMatrix * vec4<f32>( objectNormal, 0.0 ) ).xyz;

	#ifdef USE_TANGENT

		objectTangent = vec4<f32>( skinMatrix * vec4<f32>( objectTangent, 0.0 ) ).xyz;

	#endif

#endif
`;
