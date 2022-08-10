export default /* wgsl */`
var transformedNormal: vec3<f32> = objectNormal;

#ifdef USE_INSTANCING

	// this is in lieu of a per-instance normal-matrix
	// shear transforms in the instance matrix are not supported

	let m = mat3x3<f32>( 
	    instanceMatrix[instance_index][0].xyz,  
	    instanceMatrix[instance_index][1].xyz, 
	    instanceMatrix[instance_index][2].xyz
	);

	transformedNormal /= vec3<f32>( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );

	transformedNormal = m * transformedNormal;

#endif

transformedNormal = normalMatrix * transformedNormal;

#ifdef FLIP_SIDED

	transformedNormal = - transformedNormal;

#endif

#ifdef USE_TANGENT

	var transformedTangent: vec3<f32> = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;

	#ifdef FLIP_SIDED

		transformedTangent = - transformedTangent;

	#endif

#endif
`;
