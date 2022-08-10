export const vertex = /* wgsl */`
var<out> vWorldDirection: vec3<f32>;
#include <common>

@vertex
fn main() {

	vWorldDirection = transformDirection( position, modelMatrix );

	#include <begin_vertex>
	#include <project_vertex>

	wgl_position.z = wgl_position.w; // set z to camera.far
}
`;

export const fragment = /* wgsl */`
#include <common>
#include <envmap_common_pars_fragment>
var<uniform> opacity: f32;
var<in>  vWorldDirection: vec3<f32>;

#include <cube_uv_reflection_fragment>

@fragment
fn main() {

	var vReflect: vec3<f32> = vWorldDirection;
	#include <envmap_fragment>

	frag_color = envColor;
	frag_color.a *= opacity;

	#include <tonemapping_fragment>
	#include <encodings_fragment>
}
`;
