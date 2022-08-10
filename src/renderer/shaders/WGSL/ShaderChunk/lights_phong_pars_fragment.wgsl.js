export default /* wgsl */`
var<in> vViewPosition: vec3<f32>;

struct BlinnPhongMaterial {

	diffuseColor: vec3<f32>;
	specularColor: vec3<f32>;
	specularShininess: f32;
	specularStrength: f32;
	
};

fn RE_Direct_BlinnPhong(directLight: IncidentLight, geometry: GeometricContext, material: BlinnPhongMaterial, reflectedLight: ptr<function, ReflectedLight>) {

	let dotNL: f32 = saturate( dot( geometry.normal, directLight.direction ) );
	let irradiance: vec3<f32> = dotNL * directLight.color;

	(*reflectedLight).directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

	(*reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularShininess ) * material.specularStrength;
}

fn RE_IndirectDiffuse_BlinnPhong( irradiance: vec3<f32>, geometry: GeometricContext, material: BlinnPhongMaterial, reflectedLight: ptr<function, ReflectedLight> ) {

	(*reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

}

#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong

#define Material_LightProbeLOD( material )	(0)
`;
