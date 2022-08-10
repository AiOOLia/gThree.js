export default /* wgsl */`
#if NUM_CLIPPING_PLANES > 0

	var<in> vClipPosition: vec3<f32>;

	var<uniform> vec4 clippingPlanes: array<vec4<f32>,  NUM_CLIPPING_PLANES>;

#endif
`;
