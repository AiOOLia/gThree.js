export default /* wgsl */`
#ifdef USE_ENVMAP

	#ifdef ENV_WORLDPOS
	
		vWorldPosition = worldPosition.xyz;
		
	#else

		var cameraToVertex: vec3<f32>;

		if ( isOrthographic == 1 ) {

			cameraToVertex = normalize( vec3<f32>( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );

		} else {

			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );

		}

		let worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );

		#ifdef ENVMAP_MODE_REFLECTION

			vReflect = reflect( cameraToVertex, normalize(worldNormal) );

		#else

			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );

		#endif

	#endif

#endif
`;
