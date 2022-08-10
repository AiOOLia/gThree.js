import alphamap_fragment from './ShaderChunk/alphamap_fragment.wgsl.js';
import alphamap_pars_fragment from './ShaderChunk/alphamap_pars_fragment.wgsl.js';
import alphatest_fragment from './ShaderChunk/alphatest_fragment.wgsl.js';
import alphatest_pars_fragment from './ShaderChunk/alphatest_pars_fragment.wgsl.js';
import aomap_fragment from './ShaderChunk/aomap_fragment.wgsl.js';
import aomap_pars_fragment from './ShaderChunk/aomap_pars_fragment.wgsl.js';
import begin_vertex from './ShaderChunk/begin_vertex.wgsl.js';
import beginnormal_vertex from './ShaderChunk/beginnormal_vertex.wgsl.js';
import bsdfs from './ShaderChunk/bsdfs.wgsl.js';
import bumpmap_pars_fragment from './ShaderChunk/bumpmap_pars_fragment.wgsl.js';
import clipping_planes_fragment from './ShaderChunk/clipping_planes_fragment.wgsl.js';
import clipping_planes_pars_fragment from './ShaderChunk/clipping_planes_pars_fragment.wgsl.js';
import clipping_planes_pars_vertex from './ShaderChunk/clipping_planes_pars_vertex.wgsl.js';
import clipping_planes_vertex from './ShaderChunk/clipping_planes_vertex.wgsl.js';
import color_fragment from './ShaderChunk/color_fragment.wgsl.js';
import color_pars_fragment from './ShaderChunk/color_pars_fragment.wgsl.js';
import color_pars_vertex from './ShaderChunk/color_pars_vertex.wgsl.js';
import color_vertex from './ShaderChunk/color_vertex.wgsl.js';
import extended_functions from './ShaderChunk/extended_functions.wgsl';
import common from './ShaderChunk/common.wgsl.js';
import cube_uv_reflection_fragment from './ShaderChunk/cube_uv_reflection_fragment.wgsl.js';
import defaultnormal_vertex from './ShaderChunk/defaultnormal_vertex.wgsl.js';
import displacementmap_pars_vertex from './ShaderChunk/displacementmap_pars_vertex.wgsl.js';
import displacementmap_vertex from './ShaderChunk/displacementmap_vertex.wgsl.js';
import emissivemap_fragment from './ShaderChunk/emissivemap_fragment.wgsl.js';
import emissivemap_pars_fragment from './ShaderChunk/emissivemap_pars_fragment.wgsl.js';
import encodings_fragment from './ShaderChunk/encodings_fragment.wgsl.js';
import encodings_pars_fragment from './ShaderChunk/encodings_pars_fragment.wgsl.js';
import envmap_fragment from './ShaderChunk/envmap_fragment.wgsl.js';
import envmap_common_pars_fragment from './ShaderChunk/envmap_common_pars_fragment.wgsl.js';
import envmap_pars_fragment from './ShaderChunk/envmap_pars_fragment.wgsl.js';
import envmap_pars_vertex from './ShaderChunk/envmap_pars_vertex.wgsl.js';
import envmap_vertex from './ShaderChunk/envmap_vertex.wgsl.js';
import fog_vertex from './ShaderChunk/fog_vertex.wgsl.js';
import fog_pars_vertex from './ShaderChunk/fog_pars_vertex.wgsl.js';
import fog_fragment from './ShaderChunk/fog_fragment.wgsl.js';
import fog_pars_fragment from './ShaderChunk/fog_pars_fragment.wgsl.js';
//import gradientmap_pars_fragment from './ShaderChunk/gradientmap_pars_fragment.wgsl.js';
import lightmap_fragment from './ShaderChunk/lightmap_fragment.wgsl.js';
import lightmap_pars_fragment from './ShaderChunk/lightmap_pars_fragment.wgsl.js';
import lights_lambert_vertex from './ShaderChunk/lights_lambert_vertex.wgsl.js';
import lights_pars_begin from './ShaderChunk/lights_pars_begin.wgsl.js';
import envmap_physical_pars_fragment from './ShaderChunk/envmap_physical_pars_fragment.wgsl.js';
//import lights_toon_fragment from './ShaderChunk/lights_toon_fragment.wgsl.js';
//import lights_toon_pars_fragment from './ShaderChunk/lights_toon_pars_fragment.wgsl.js';
import lights_phong_fragment from './ShaderChunk/lights_phong_fragment.wgsl.js';
import lights_phong_pars_fragment from './ShaderChunk/lights_phong_pars_fragment.wgsl.js';
//import lights_physical_fragment from './ShaderChunk/lights_physical_fragment.wgsl.js';
//import lights_physical_pars_fragment from './ShaderChunk/lights_physical_pars_fragment.wgsl.js';
import lights_fragment_begin from './ShaderChunk/lights_fragment_begin.wgsl.js';
import lights_fragment_maps from './ShaderChunk/lights_fragment_maps.wgsl.js';
import lights_fragment_end from './ShaderChunk/lights_fragment_end.wgsl.js';
import logdepthbuf_fragment from './ShaderChunk/logdepthbuf_fragment.wgsl.js';
import logdepthbuf_pars_fragment from './ShaderChunk/logdepthbuf_pars_fragment.wgsl.js';
import logdepthbuf_pars_vertex from './ShaderChunk/logdepthbuf_pars_vertex.wgsl.js';
import logdepthbuf_vertex from './ShaderChunk/logdepthbuf_vertex.wgsl.js';
import map_fragment from './ShaderChunk/map_fragment.wgsl.js';
import map_pars_fragment from './ShaderChunk/map_pars_fragment.wgsl.js';
//import map_particle_fragment from './ShaderChunk/map_particle_fragment.wgsl.js';
//import map_particle_pars_fragment from './ShaderChunk/map_particle_pars_fragment.wgsl.js';
//import metalnessmap_fragment from './ShaderChunk/metalnessmap_fragment.wgsl.js';
//import metalnessmap_pars_fragment from './ShaderChunk/metalnessmap_pars_fragment.wgsl.js';
import morphnormal_vertex from './ShaderChunk/morphnormal_vertex.wgsl.js';
import morphtarget_pars_vertex from './ShaderChunk/morphtarget_pars_vertex.wgsl.js';
import morphtarget_vertex from './ShaderChunk/morphtarget_vertex.wgsl.js';
import normal_fragment_begin from './ShaderChunk/normal_fragment_begin.wgsl.js';
import normal_fragment_maps from './ShaderChunk/normal_fragment_maps.wgsl.js';
import normal_pars_fragment from './ShaderChunk/normal_pars_fragment.wgsl.js';
import normal_pars_vertex from './ShaderChunk/normal_pars_vertex.wgsl.js';
import normal_vertex from './ShaderChunk/normal_vertex.wgsl.js';
import normalmap_pars_fragment from './ShaderChunk/normalmap_pars_fragment.wgsl.js';
//import clearcoat_normal_fragment_begin from './ShaderChunk/clearcoat_normal_fragment_begin.wgsl.js';
//import clearcoat_normal_fragment_maps from './ShaderChunk/clearcoat_normal_fragment_maps.wgsl.js';
//import clearcoat_pars_fragment from './ShaderChunk/clearcoat_pars_fragment.wgsl.js';
import output_fragment from './ShaderChunk/output_fragment.wgsl.js';
import packing from './ShaderChunk/packing.wgsl.js';
import premultiplied_alpha_fragment from './ShaderChunk/premultiplied_alpha_fragment.wgsl.js';
import project_vertex from './ShaderChunk/project_vertex.wgsl.js';
import dithering_fragment from './ShaderChunk/dithering_fragment.wgsl.js';
import dithering_pars_fragment from './ShaderChunk/dithering_pars_fragment.wgsl.js';
//import roughnessmap_fragment from './ShaderChunk/roughnessmap_fragment.wgsl.js';
//import roughnessmap_pars_fragment from './ShaderChunk/roughnessmap_pars_fragment.wgsl.js';
import shadowmap_pars_fragment from './ShaderChunk/shadowmap_pars_fragment.wgsl.js';
import shadowmap_pars_vertex from './ShaderChunk/shadowmap_pars_vertex.wgsl.js';
import shadowmap_vertex from './ShaderChunk/shadowmap_vertex.wgsl.js';
import shadowmask_pars_fragment from './ShaderChunk/shadowmask_pars_fragment.wgsl.js';
import skinbase_vertex from './ShaderChunk/skinbase_vertex.wgsl.js';
import skinning_pars_vertex from './ShaderChunk/skinning_pars_vertex.wgsl.js';
import skinning_vertex from './ShaderChunk/skinning_vertex.wgsl.js';
import skinnormal_vertex from './ShaderChunk/skinnormal_vertex.wgsl.js';
import specularmap_fragment from './ShaderChunk/specularmap_fragment.wgsl.js';
import specularmap_pars_fragment from './ShaderChunk/specularmap_pars_fragment.wgsl.js';
import tonemapping_fragment from './ShaderChunk/tonemapping_fragment.wgsl.js';
import tonemapping_pars_fragment from './ShaderChunk/tonemapping_pars_fragment.wgsl.js';
//import transmission_fragment from './ShaderChunk/transmission_fragment.wgsl.js';
//import transmission_pars_fragment from './ShaderChunk/transmission_pars_fragment.wgsl.js';
import uv_pars_fragment from './ShaderChunk/uv_pars_fragment.wgsl.js';
import uv_pars_vertex from './ShaderChunk/uv_pars_vertex.wgsl.js';
import uv_vertex from './ShaderChunk/uv_vertex.wgsl.js';
import uv2_pars_fragment from './ShaderChunk/uv2_pars_fragment.wgsl.js';
import uv2_pars_vertex from './ShaderChunk/uv2_pars_vertex.wgsl.js';
import uv2_vertex from './ShaderChunk/uv2_vertex.wgsl.js';
import worldpos_vertex from './ShaderChunk/worldpos_vertex.wgsl.js';

import * as background from './ShaderLib/background.wgsl.js';
import * as cube from './ShaderLib/cube.wgsl.js';
//import * as depth from './ShaderLib/depth.wgsl.js';
//import * as distanceRGBA from './ShaderLib/distanceRGBA.wgsl.js';
//import * as equirect from './ShaderLib/equirect.wgsl.js';
//import * as linedashed from './ShaderLib/linedashed.wgsl.js';
import * as meshbasic from './ShaderLib/meshbasic.wgsl.js';
import * as meshlambert from './ShaderLib/meshlambert.wgsl.js';
//import * as meshmatcap from './ShaderLib/meshmatcap.wgsl.js';
import * as meshnormal from './ShaderLib/meshnormal.wgsl.js';
import * as meshphong from './ShaderLib/meshphong.wgsl.js';
//import * as meshphysical from './ShaderLib/meshphysical.wgsl.js';
//import * as meshtoon from './ShaderLib/meshtoon.wgsl.js';
//import * as points from './ShaderLib/points.wgsl.js';
//import * as shadow from './ShaderLib/shadow.wgsl.js';
//import * as sprite from './ShaderLib/sprite.wgsl.js';

export const ShaderChunk = {
	alphamap_fragment: alphamap_fragment,
	alphamap_pars_fragment: alphamap_pars_fragment,
	alphatest_fragment: alphatest_fragment,
	alphatest_pars_fragment: alphatest_pars_fragment,
	aomap_fragment: aomap_fragment,
	aomap_pars_fragment: aomap_pars_fragment,
	begin_vertex: begin_vertex,
	beginnormal_vertex: beginnormal_vertex,
	bsdfs: bsdfs,
	bumpmap_pars_fragment: bumpmap_pars_fragment,
	clipping_planes_fragment: clipping_planes_fragment,
	clipping_planes_pars_fragment: clipping_planes_pars_fragment,
	clipping_planes_pars_vertex: clipping_planes_pars_vertex,
	clipping_planes_vertex: clipping_planes_vertex,
	color_fragment: color_fragment,
	color_pars_fragment: color_pars_fragment,
	color_pars_vertex: color_pars_vertex,
	color_vertex: color_vertex,
	extended_functions: extended_functions,
	common: common,
	cube_uv_reflection_fragment: cube_uv_reflection_fragment,
	defaultnormal_vertex: defaultnormal_vertex,
	displacementmap_pars_vertex: displacementmap_pars_vertex,
	displacementmap_vertex: displacementmap_vertex,
	emissivemap_fragment: emissivemap_fragment,
	emissivemap_pars_fragment: emissivemap_pars_fragment,
	encodings_fragment: encodings_fragment,
	encodings_pars_fragment: encodings_pars_fragment,
	envmap_fragment: envmap_fragment,
	envmap_common_pars_fragment: envmap_common_pars_fragment,
	envmap_pars_fragment: envmap_pars_fragment,
	envmap_pars_vertex: envmap_pars_vertex,
	envmap_physical_pars_fragment: envmap_physical_pars_fragment,
	envmap_vertex: envmap_vertex,
	fog_vertex: fog_vertex,
	fog_pars_vertex: fog_pars_vertex,
	fog_fragment: fog_fragment,
	fog_pars_fragment: fog_pars_fragment,
	//gradientmap_pars_fragment: gradientmap_pars_fragment,
	lightmap_fragment: lightmap_fragment,
	lightmap_pars_fragment: lightmap_pars_fragment,
	lights_lambert_vertex: lights_lambert_vertex,
	lights_pars_begin: lights_pars_begin,
	//lights_toon_fragment: lights_toon_fragment,
	//lights_toon_pars_fragment: lights_toon_pars_fragment,
	lights_phong_fragment: lights_phong_fragment,
	lights_phong_pars_fragment: lights_phong_pars_fragment,
	//lights_physical_fragment: lights_physical_fragment,
	//lights_physical_pars_fragment: lights_physical_pars_fragment,
	lights_fragment_begin: lights_fragment_begin,
	lights_fragment_maps: lights_fragment_maps,
	lights_fragment_end: lights_fragment_end,
	logdepthbuf_fragment: logdepthbuf_fragment,
	logdepthbuf_pars_fragment: logdepthbuf_pars_fragment,
	logdepthbuf_pars_vertex: logdepthbuf_pars_vertex,
	logdepthbuf_vertex: logdepthbuf_vertex,
	map_fragment: map_fragment,
	map_pars_fragment: map_pars_fragment,
	//map_particle_fragment: map_particle_fragment,
	//map_particle_pars_fragment: map_particle_pars_fragment,
	//metalnessmap_fragment: metalnessmap_fragment,
	//metalnessmap_pars_fragment: metalnessmap_pars_fragment,
	morphnormal_vertex: morphnormal_vertex,
	morphtarget_pars_vertex: morphtarget_pars_vertex,
	morphtarget_vertex: morphtarget_vertex,
	normal_fragment_begin: normal_fragment_begin,
	normal_fragment_maps: normal_fragment_maps,
	normal_pars_fragment: normal_pars_fragment,
	normal_pars_vertex: normal_pars_vertex,
	normal_vertex: normal_vertex,
	normalmap_pars_fragment: normalmap_pars_fragment,
	//clearcoat_normal_fragment_begin: clearcoat_normal_fragment_begin,
	//clearcoat_normal_fragment_maps: clearcoat_normal_fragment_maps,
	//clearcoat_pars_fragment: clearcoat_pars_fragment,
	output_fragment: output_fragment,
	packing: packing,
	premultiplied_alpha_fragment: premultiplied_alpha_fragment,
	project_vertex: project_vertex,
	dithering_fragment: dithering_fragment,
	dithering_pars_fragment: dithering_pars_fragment,
	//roughnessmap_fragment: roughnessmap_fragment,
	//roughnessmap_pars_fragment: roughnessmap_pars_fragment,
	shadowmap_pars_fragment: shadowmap_pars_fragment,
	shadowmap_pars_vertex: shadowmap_pars_vertex,
	shadowmap_vertex: shadowmap_vertex,
	shadowmask_pars_fragment: shadowmask_pars_fragment,
	skinbase_vertex: skinbase_vertex,
	skinning_pars_vertex: skinning_pars_vertex,
	skinning_vertex: skinning_vertex,
	skinnormal_vertex: skinnormal_vertex,
	specularmap_fragment: specularmap_fragment,
	specularmap_pars_fragment: specularmap_pars_fragment,
	tonemapping_fragment: tonemapping_fragment,
	tonemapping_pars_fragment: tonemapping_pars_fragment,
	//transmission_fragment: transmission_fragment,
	//transmission_pars_fragment: transmission_pars_fragment,
	uv_pars_fragment: uv_pars_fragment,
	uv_pars_vertex: uv_pars_vertex,
	uv_vertex: uv_vertex,
	uv2_pars_fragment: uv2_pars_fragment,
	uv2_pars_vertex: uv2_pars_vertex,
	uv2_vertex: uv2_vertex,
	worldpos_vertex: worldpos_vertex,

	background_vert: background.vertex,
	background_frag: background.fragment,
	cube_vert: cube.vertex,
	cube_frag: cube.fragment,
	//depth_vert: depth.vertex,
	//depth_frag: depth.fragment,
	//distanceRGBA_vert: distanceRGBA.vertex,
	//distanceRGBA_frag: distanceRGBA.fragment,
	//equirect_vert: equirect.vertex,
	//equirect_frag: equirect.fragment,
	//linedashed_vert: linedashed.vertex,
	//linedashed_frag: linedashed.fragment,
	meshbasic_vert: meshbasic.vertex,
	meshbasic_frag: meshbasic.fragment,
	meshlambert_vert: meshlambert.vertex,
	meshlambert_frag: meshlambert.fragment,
	//meshmatcap_vert: meshmatcap.vertex,
	//meshmatcap_frag: meshmatcap.fragment,
	meshnormal_vert: meshnormal.vertex,
	meshnormal_frag: meshnormal.fragment,
	meshphong_vert: meshphong.vertex,
	meshphong_frag: meshphong.fragment,
	//meshphysical_vert: meshphysical.vertex,
	//meshphysical_frag: meshphysical.fragment,
	//meshtoon_vert: meshtoon.vertex,
	//meshtoon_frag: meshtoon.fragment,
	//points_vert: points.vertex,
	//points_frag: points.fragment,
	//shadow_vert: shadow.vertex,
	//shadow_frag: shadow.fragment,
	//sprite_vert: sprite.vertex,
	//sprite_frag: sprite.fragment
};
