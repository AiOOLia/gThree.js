export const vertex = /* wgsl */`
#define LAMBERT

var<out>  vLightFront: vec3<f32>;
var<out>  vIndirectFront: vec3<f32>;

#ifdef DOUBLE_SIDED
	var<out>  vLightBack: vec3<f32>;
	var<out>  vIndirectBack: vec3<f32>;
#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

@vertex
fn main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}
`;

export const fragment = /* wgsl */`
var<uniform> diffuse: vec3<f32>;
var<uniform> emissive: vec3<f32>;
var<uniform> opacity: f32;

var<in>  vLightFront: vec3<f32>;
var<in>  vIndirectFront: vec3<f32>;

#ifdef DOUBLE_SIDED
	var<in>  vLightBack: vec3<f32>;
	var<in>  vIndirectBack: vec3<f32>;
#endif


#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

@fragment
fn main() {

	#include <clipping_planes_fragment>

	var diffuseColor: vec4<f32> = vec4<f32>( diffuse, opacity );
	var reflectedLight: ReflectedLight = ReflectedLight( vec3<f32>( 0.0 ), vec3<f32>( 0.0 ), vec3<f32>( 0.0 ), vec3<f32>( 0.0 ) );
	var totalEmissiveRadiance: vec3<f32> = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>

	// accumulation

	#ifdef DOUBLE_SIDED

        if front_facing {
          reflectedLight.indirectDiffuse += vIndirectFront;
        } else {
          reflectedLight.indirectDiffuse += vIndirectBack;
        }
	#else

		reflectedLight.indirectDiffuse += vIndirectFront;

	#endif

	#include <lightmap_fragment>

	reflectedLight.indirectDiffuse *= BRDF_Lambert( diffuseColor.rgb );

	#ifdef DOUBLE_SIDED

        if front_facing {
           reflectedLight.directDiffuse = vLightFront;
        } else {
           reflectedLight.directDiffuse = vLightBack;
        }
	#else

		reflectedLight.directDiffuse = vLightFront;

	#endif

	reflectedLight.directDiffuse *= BRDF_Lambert( diffuseColor.rgb ) * getShadowMask();

	// modulation

	#include <aomap_fragment>

	var outgoingLight: vec3<f32> = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;

	#include <envmap_fragment>

	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
`;
