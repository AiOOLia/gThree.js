export default /* wgsl */`
#ifdef USE_SKINNING

	var<uniform> bindMatrix: mat4x4<f32>;
	var<uniform> bindMatrixInverse: mat4x4<f32>;

	#ifdef BONE_TEXTURE

		var boneTexture: texture_2d<f32>;
		var boneTextureSampler: sampler;
		var<uniform> boneTextureSize: i32;

		fn getBoneMatrix( i: f32 )->mat4x4<f32> {

			var j = i * 4.0;
			var x = modulo( j, float( boneTextureSize ) );
			var y = floor( j / float( boneTextureSize ) );

			var dx = 1.0 / float( boneTextureSize );
			var dy = 1.0 / float( boneTextureSize );

			y = dy * ( y + 0.5 );

			let v1 = textureSample( boneTexture, boneTextureSampler, vec2<f32>( dx * ( x + 0.5 ), y ) );
			let v2 = textureSample( boneTexture, boneTextureSampler, vec2<f32>( dx * ( x + 1.5 ), y ) );
			let v3 = textureSample( boneTexture, boneTextureSampler, vec2<f32>( dx * ( x + 2.5 ), y ) );
			let v4 = textureSample( boneTexture, boneTextureSampler, vec2<f32>( dx * ( x + 3.5 ), y ) );

			let bone = mat4<f32>( v1, v2, v3, v4 );

			return bone;

		}

	#else

		var<uniform> mat4 boneMatrices: array<mat4x4<f32>, MAX_BONES>;

		fn getBoneMatrix(  i: i32 )->mat4x4<f32> {

			var bone = boneMatrices[ i ];
			return bone;

		}

	#endif

#endif
`;
