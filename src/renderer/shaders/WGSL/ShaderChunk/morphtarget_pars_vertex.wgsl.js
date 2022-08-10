export default /* wgsl */`
#ifdef USE_MORPHTARGETS

	var<uniform> morphTargetBaseInfluence: f32;

	#ifdef MORPHTARGETS_TEXTURE

		var<uniform> morphTargetInfluences: array<f32, MORPHTARGETS_COUNT>;
		var morphTargetsTexture: texture_2d_array<f32>;
		var morphTargetsTextureSampler: sampler;
		var<uniform> morphTargetsTextureSize: vec2<f32>;

		fn getMorph( vertexIndex: i32, morphTargetIndex: i32, offset: i32, stride: i32 )->vec3<f32> {

			let texelIndex = float( vertexIndex * stride + offset );
			let y = floor( texelIndex / morphTargetsTextureSize.x );
			let x = texelIndex - y * morphTargetsTextureSize.x;

			let morphUV = vec3( ( x + 0.5 ) / morphTargetsTextureSize.x, y / morphTargetsTextureSize.y, morphTargetIndex );
			return textureSample( morphTargetsTexture, morphTargetsTextureSampler, morphUV ).xyz;

		}

	#else

		#ifndef USE_MORPHNORMALS

			var<uniform> morphTargetInfluences: array<f32, 8>;

		#else

			var<uniform> morphTargetInfluences: array<f32, 4>;

		#endif

	#endif

#endif
`;
