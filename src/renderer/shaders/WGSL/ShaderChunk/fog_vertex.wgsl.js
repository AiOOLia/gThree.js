export default /* wgsl */`
#ifdef USE_FOG

	vFogDepth = - mvPosition.z;

#endif
`;
