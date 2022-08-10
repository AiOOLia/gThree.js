export default /* wgsl */`
var faceDirection = -1.0;
if(front_facing){
   faceDirection = 1.0;
}

#ifdef FLAT_SHADED

	// Workaround for Adreno GPUs not able to do dFdx( vViewPosition )

	let fdx = vec3( dpdx( vViewPosition.x ), dpdx( vViewPosition.y ), dpdx( vViewPosition.z ) );
	let fdy = vec3( dpdy( vViewPosition.x ), dpdy( vViewPosition.y ), dpdy( vViewPosition.z ) );
	let normal = normalize( cross( fdy, fdx ) );

#else

	var normal = normalize( vNormal );

	#ifdef DOUBLE_SIDED

		normal = normal * faceDirection;

	#endif

	#ifdef USE_TANGENT

		var tangent = normalize( vTangent );
		var bitangent = normalize( vBitangent );

		#ifdef DOUBLE_SIDED

			tangent = tangent * faceDirection;
			bitangent = bitangent * faceDirection;

		#endif

		#if defined( TANGENTSPACE_NORMALMAP ) || defined( USE_CLEARCOAT_NORMALMAP )

			var vTBN = mat3( tangent, bitangent, normal );

		#endif

	#endif

#endif

// non perturbed normal for clearcoat among others

var geometryNormal: vec3<f32> = normal;

`;
