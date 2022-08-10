export default /* wgsl */`
#ifdef ENVMAP_TYPE_CUBE_UV

	let cubeUV_maxMipLevel = 8.0
	let cubeUV_minMipLevel = 4.0
	let cubeUV_maxTileSize = 256.0
	let cubeUV_minTileSize = 16.0

	// These shader functions convert between the UV coordinates of a single face of
	// a cubemap, the 0-5 integer index of a cube face, and the direction vector for
	// sampling a textureCube (not generally normalized ).

	fn getFace( vec3 direction )->f32 {

		let absDirection = abs( direction );

		var face: f32 = - 1.0;

		if ( absDirection.x > absDirection.z ) {

			if ( absDirection.x > absDirection.y )

				face = direction.x > 0.0 ? 0.0 : 3.0;

			else

				face = direction.y > 0.0 ? 1.0 : 4.0;

		} else {

			if ( absDirection.z > absDirection.y )

				face = direction.z > 0.0 ? 2.0 : 5.0;

			else

				face = direction.y > 0.0 ? 1.0 : 4.0;

		}

		return face;

	}

	// RH coordinate system; PMREM face-indexing convention
	fn getUV( direction: vec3<f32>, face: f32 )->vec2<f32> {

		var uv: vec2<f32>;

		if ( face == 0.0 ) {

			uv = vec2<f32>( direction.z, direction.y ) / abs( direction.x ); // pos x

		} else if ( face == 1.0 ) {

			uv = vec2<f32>( - direction.x, - direction.z ) / abs( direction.y ); // pos y

		} else if ( face == 2.0 ) {

			uv = vec2<f32>( - direction.x, direction.y ) / abs( direction.z ); // pos z

		} else if ( face == 3.0 ) {

			uv = vec2<f32>( - direction.z, direction.y ) / abs( direction.x ); // neg x

		} else if ( face == 4.0 ) {

			uv = vec2<f32>( - direction.x, direction.z ) / abs( direction.y ); // neg y

		} else {

			uv = vec2<f32>( direction.x, direction.y ) / abs( direction.z ); // neg z

		}

		return 0.5 * ( uv + 1.0 );

	}

	fn bilinearCubeUV( envMap: texture_2d<f32>, envMapSampler: sampler, direction: vec3<f32>, mipInt: f32 )->vec3<f32> {

		let face = getFace( direction );

		let filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );

		mipInt = max( mipInt, cubeUV_minMipLevel );

		let faceSize = exp2( mipInt );

		let texelSize = 1.0 / ( 3.0 * cubeUV_maxTileSize );

		var uv: vec2<f32> = getUV( direction, face ) * ( faceSize - 1.0 ) + 0.5;

		if ( face > 2.0 ) {

			uv.y += faceSize;

			face -= 3.0;

		}

		uv.x += face * faceSize;

		if ( mipInt < cubeUV_maxMipLevel ) {

			uv.y += 2.0 * cubeUV_maxTileSize;

		}

		uv.y += filterInt * 2.0 * cubeUV_minTileSize;

		uv.x += 3.0 * max( 0.0, cubeUV_maxTileSize - 2.0 * faceSize );

		uv *= texelSize;

		return textureSample( envMap, envMapSampler, uv ).rgb;

	}

	// These defines must match with PMREMGenerator

	let r0 = 1.0;
	let v0 = 0.339;
	let m0 = - 2.0;
	let r1 = 0.8;
	let v1 = 0.276;
	let m1 = - 1.0;
	let r4 = 0.4;
	let v4 = 0.046;
	let m4 = 2.0;
	let r5 = 0.305;
	let v5 = 0.016;
	let m5 = 3.0;
	let r6 = 0.21;
	let v6 = 0.0038;
	let m6 = 4.0;

	fn roughnessToMip( roughness: f32 )->f32 {

		var mip: f32 = 0.0;

		if ( roughness >= r1 ) {

			mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;

		} else if ( roughness >= r4 ) {

			mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;

		} else if ( roughness >= r5 ) {

			mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;

		} else if ( roughness >= r6 ) {

			mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;

		} else {

			mip = - 2.0 * log2( 1.16 * roughness ); // 1.16 = 1.79^0.25
		}

		return mip;

	}

	fn textureCubeUV( envMap: texture_2d<f32>, envMapSampler: sampler, vec3 sampleDir, float roughness )->vec4<f32> {

		let mip = clamp( roughnessToMip( roughness ), m0, cubeUV_maxMipLevel );

		let mipF = fract( mip );

		let mipInt = floor( mip );

		let color0 = bilinearCubeUV( envMap, sampleDir, mipInt );

		if ( mipF == 0.0 ) {

			return vec4<f32>( color0, 1.0 );

		} else {

			let color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );

			return vec4<f32>( mix( color0, color1, mipF ), 1.0 );

		}

	}

#endif
`;
