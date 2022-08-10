export default /* wgsl */`
#ifdef USE_SKINNING

	let skinVertex = bindMatrix * vec4<f32>( transformed, 1.0 );

	var skinned = vec4<f32>( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;

	transformed = ( bindMatrixInverse * skinned ).xyz;

#endif
`;
