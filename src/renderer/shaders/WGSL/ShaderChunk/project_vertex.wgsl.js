export default /* wgsl */`
var mvPosition = vec4( transformed, 1.0 );

#ifdef USE_INSTANCING

	mvPosition = instanceMatrix[instance_index] * mvPosition;

#endif

mvPosition = modelViewMatrix * mvPosition;

wgl_position = projectionMatrix * mvPosition;
`;
