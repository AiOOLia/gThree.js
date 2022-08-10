export default /* wgsl */`
var objectNormal: vec3<f32> = vec3<f32>( normal.xyz );

#ifdef USE_TANGENT

	var objectTangent = vec3<f32>( tangent.xyz );

#endif
`;
