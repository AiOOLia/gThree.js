export default /* wgsl */`
#if defined( USE_ENVMAP )

	#ifdef ENVMAP_MODE_REFRACTION

		var<uniform> refractionRatio: f32;

	#endif

	fn getIBLIrradiance( normal: vec3<f32> )->vec3<f32> {

		#if defined( ENVMAP_TYPE_CUBE_UV )

			let worldNormal = inverseTransformDirection( normal, viewMatrix );

			let envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );

			return PI * envMapColor.rgb * envMapIntensity;

		#else

			return vec3<f32>( 0.0 );

		#endif

	}

	fn getIBLRadiance( viewDir: vec3<f32>, normal: vec3<f32>, roughness: f32 )->vec3<f32> {

		#if defined( ENVMAP_TYPE_CUBE_UV )

			var reflectVec: vec3<f32>;

			#ifdef ENVMAP_MODE_REFLECTION

				reflectVec = reflect( - viewDir, normal );

				// Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
				reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );

			#else

				reflectVec = refract( - viewDir, normal, refractionRatio );

			#endif

			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );

			let envMapColor = textureCubeUV( envMap, reflectVec, roughness );

			return envMapColor.rgb * envMapIntensity;

		#else

			return vec3<f32>( 0.0 );

		#endif

	}

#endif
`;
