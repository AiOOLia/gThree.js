export default /* wgsl */`
#ifdef USE_ENVMAP

	#ifdef ENV_WORLDPOS

		var cameraToFrag: vec3<f32>;

		if ( isOrthographic==1 ) {

			cameraToFrag = normalize( vec3<f32>( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );

		} else {

			cameraToFrag = normalize( vWorldPosition - cameraPosition );

		}

		// Transforming Normal Vectors with the Inverse Transformation
		let worldNormal = inverseTransformDirection( normal , viewMatrix );

		#ifdef ENVMAP_MODE_REFLECTION

			let reflectVec = reflect( cameraToFrag, worldNormal);

		#else

			let reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );

		#endif

	#else

		let reflectVec = vReflect;

	#endif

	#ifdef ENVMAP_TYPE_CUBE

		let envColor: vec4<f32>  = textureSample( envMap, envMapSampler, vec3<f32>( flipEnvMap * reflectVec.x, reflectVec.yz ) );

	#elif defined( ENVMAP_TYPE_CUBE_UV )

		let envColor = textureCubeUV( envMap, envMapSampler, reflectVec, 0.0 );

	#else

		let envColor = vec4<f32>( 0.0 );

	#endif

	#ifdef ENVMAP_BLENDING_MULTIPLY

		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );

	#elif defined( ENVMAP_BLENDING_MIX )

		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );

	#elif defined( ENVMAP_BLENDING_ADD )

		outgoingLight += envColor.xyz * specularStrength * reflectivity;

	#endif
	

#endif
`;
