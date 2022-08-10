export default /* wgsl */`
#ifdef USE_MAP

	let sampledDiffuseColor = textureSample( map, mapSampler, vUv );

	#ifdef DECODE_VIDEO_TEXTURE

		// inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)

		sampledDiffuseColor = vec4<f32>( 
            mix( 
                pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3<f32>( 0.0521327014 ), vec3<f32>( 2.4 ) ), 
                sampledDiffuseColor.rgb * 0.0773993808, 
                vec3<f32>( lessThanEqual( sampledDiffuseColor.rgb, vec3<f32>( 0.04045 ) ) ) 
            ), 
            sampledDiffuseColor.w 
		);

	#endif

	diffuseColor *= sampledDiffuseColor;

#endif
`;
