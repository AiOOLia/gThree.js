export default /* wgsl */`
#if defined( USE_COLOR_ALPHA )

	vColor = vec4<f32>( 1.0 );

#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )

	vColor = vec3<f32>( 1.0 );

#endif

#ifdef USE_COLOR

	vColor *= color;

#endif

#ifdef USE_INSTANCING_COLOR

	vColor.xyz *= instanceColor[instance_index].xyz;

#endif
`;
