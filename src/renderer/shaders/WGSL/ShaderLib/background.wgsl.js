export const vertex = /* wgsl */`
var<out> vUv: vec2<f32>;
var<uniform>  uvTransform: mat3x3<f32>;

@vertex
fn main() {

	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;

	wgl_position = vec4( position.xy, 1.0, 1.0 );

}
`;

export const fragment = /* wgsl */`
var t2D: texture_2d<f32>;
var t2DSampler: sampler;

var<in>  vUv: vec2<f32>;

@fragment
fn main() {

	frag_color = textureSample( t2D, t2DSampler, vUv );

	#include <tonemapping_fragment>
	#include <encodings_fragment>

}
`;
