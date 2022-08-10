export default /* wgsl */`
#ifdef USE_FOG

	#ifdef FOG_EXP2

		let fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );

	#else

		let fogFactor = smoothstep( fogNear, fogFar, vFogDepth );

	#endif

	frag_color.rgb = mix( frag_color.rgb, fogColor, fogFactor );

#endif
`;
