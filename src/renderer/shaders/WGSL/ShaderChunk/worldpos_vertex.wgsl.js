export default /* wgsl */`
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION )

	var worldPosition = vec4<f32>( transformed, 1.0 );

	#ifdef USE_INSTANCING

		worldPosition = instanceMatrix[instance_index] * worldPosition;

	#endif

	worldPosition = modelMatrix * worldPosition;

#endif
`;
