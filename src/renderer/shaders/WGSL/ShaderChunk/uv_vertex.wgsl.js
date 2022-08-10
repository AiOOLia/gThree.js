export default /* wgsl */`
#ifdef USE_UV

	vUv = ( uvTransform * vec3<f32>( uv, 1.0 ) ).xy;

#endif
`;
