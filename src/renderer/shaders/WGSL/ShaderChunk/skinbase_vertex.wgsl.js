export default /* wgsl */`
#ifdef USE_SKINNING

	let boneMatX = getBoneMatrix( skinIndex.x );
	let boneMatY = getBoneMatrix( skinIndex.y );
	let boneMatZ = getBoneMatrix( skinIndex.z );
	let boneMatW = getBoneMatrix( skinIndex.w );

#endif
`;
