export default /* wgsl */`
#ifdef USE_ALPHAMAP

	diffuseColor.a *= textureSample( alphaMap, alphaMapSampler, vUv ).g;

#endif
`;
