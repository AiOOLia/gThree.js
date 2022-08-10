export default /* wgsl */`
#ifdef USE_NORMALMAP

	var normalMap: texture_2d<f32>;
	var normalMapSampler: sampler;
	var<uniform> normalScale: vec2<f32>;

#endif

#ifdef OBJECTSPACE_NORMALMAP

	var<uniform> normalMatrix: mat3x3<f32>;

#endif

#if ! defined ( USE_TANGENT ) && ( defined ( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP ) )

	// Normal Mapping Without Precomputed Tangents
	// http://www.thetenthplanet.de/archives/1180

	fn perturbNormal2Arb( eye_pos: vec3<f32>, surf_norm: vec3<f32>, mapN: vec3<f32>, faceDirection: f32 )->vec3<f32> {

		// Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

		let q0 = vec3<f32>( dpdx( eye_pos.x ), dpdx( eye_pos.y ), dpdx( eye_pos.z ) );
		let q1 = vec3<f32>( dpdy( eye_pos.x ), dpdy( eye_pos.y ), dpdy( eye_pos.z ) );
		let st0 = dpdx( vUv.st );
	    let st1 = dpdy( vUv.st );

		let N = surf_norm; // normalized

		let q1perp = cross( q1, N );
		let q0perp = cross( N, q0 );

		let T = q1perp * st0.x + q0perp * st1.x;
		let B = q1perp * st0.y + q0perp * st1.y;

		let det = max( dot( T, T ), dot( B, B ) );
		let scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );

		return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );

	}

#endif
`;
