export default /* wgsl */`
#ifdef USE_BUMPMAP

	var bumpMap: texture_2d<f32>;
	var bumpMapSampler: sampler;
	var<uniform> bumpScale: f32;

	// Bump Mapping Unparametrized Surfaces on the GPU by Morten S. Mikkelsen
	// https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf

	// Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)

	fn dHdxy_fwd()->vec2<f32> {

		let dSTdx = dFdx( vUv );
		let dSTdy = dFdy( vUv );

		let Hll = bumpScale * textureSample( bumpMap, bumpMapSampler, vUv ).x;
		let dBx = bumpScale * textureSample( bumpMap, bumpMapSampler, vUv + dSTdx ).x - Hll;
		let dBy = bumpScale * textureSample( bumpMap, bumpMapSampler, vUv + dSTdy ).x - Hll;

		return vec2( dBx, dBy );
	}

	fn perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection )->vec3<f32> {

		// Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

		let vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
		let vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
		let vN = surf_norm;		// normalized

		let R1 = cross( vSigmaY, vN );
		let R2 = cross( vN, vSigmaX );

		let fDet = dot( vSigmaX, R1 ) * faceDirection;

		let vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );

	}

#endif
`;
