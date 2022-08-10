export default /* wgsl */`
var<uniform>  receiveShadow: i32;
var<uniform> ambientLightColor: vec3<f32>;
var<uniform> lightProbe: array<vec3<f32>,  9>;

// get the irradiance (radiance convolved with cosine lobe) at the point 'normal' on the unit sphere
// source: https://graphics.stanford.edu/papers/envmap/envmap.pdf
fn shGetIrradianceAt( normal: vec3<f32>, shCoefficients: array<vec3<f32>, 9> )->vec3<f32> {

	// normal is assumed to have unit length

	let x = normal.x;
	let y = normal.y;
	let z = normal.z;

	// band 0
	var result: vec3<f32> = shCoefficients[ 0 ] * 0.886227;

	// band 1
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;

	// band 2
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );

	return result;

}

fn getLightProbeIrradiance( lightProbe: array<vec3<f32>, 9>, normal: vec3<f32>, viewMatrix: mat4x4<f32> )->vec3<f32> {

	let worldNormal = inverseTransformDirection( normal, viewMatrix );

	let irradiance = shGetIrradianceAt( worldNormal, lightProbe );

	return irradiance;

}

fn getAmbientLightIrradiance( ambientLightColor: vec3<f32> )->vec3<f32> {

	let irradiance = ambientLightColor;

	return irradiance;

}

fn getDistanceAttenuation( lightDistance: f32, cutoffDistance: f32, decayExponent: f32 )->f32 {

	#if defined ( PHYSICALLY_CORRECT_LIGHTS )

		// based upon Frostbite 3 Moving to Physically-based Rendering
		// page 32, equation 26: E[window1]
		// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
		let distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );

		if ( cutoffDistance > 0.0 ) {

			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );

		}

		return distanceFalloff;

	#else

		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {

			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );

		}

		return 1.0;

	#endif

}

fn getSpotAttenuation( coneCosine: f32, penumbraCosine: f32, angleCosine: f32 )->f32 {

	return smoothstep( coneCosine, penumbraCosine, angleCosine );

}

#if NUM_DIR_LIGHTS > 0

	struct DirectionalLight {
		direction: vec3<f32>;
		color: vec3<f32>;
	};

	var<uniform> directionalLights: array<DirectionalLight, NUM_DIR_LIGHTS>;

	fn getDirectionalLightInfo( directionalLight: DirectionalLight, geometry: GeometricContext, light: ptr<function, IncidentLight> ) {

		(*light).color = directionalLight.color;
		(*light).direction = directionalLight.direction;
		(*light).visible = 1;

	}

#endif


#if NUM_POINT_LIGHTS > 0

	struct PointLight {
		position: vec3<f32>;
		color: vec3<f32>;
		distance: f32;
		decay: f32;
	};

	var<uniform> pointLights:array<PointLight, NUM_POINT_LIGHTS>;

	// light is an out parameter as having it as a return value caused compiler errors on some devices
	fn getPointLightInfo( pointLight: PointLight, geometry: GeometricContext, light: ptr<function,IncidentLight> ) {

		let lVector = pointLight.position - geometry.position;

		(*light).direction = normalize( lVector );

		let lightDistance = length( lVector );

		(*light).color = pointLight.color;
		(*light).color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		(*light).visible = ( light.color != vec3( 0.0 ) );

	}

#endif


#if NUM_SPOT_LIGHTS > 0

	struct SpotLight {
		position: vec3<f32>;
		direction: vec3<f32>;
		color: vec3<f32>;
		distance: f32;
		decay: f32;
		coneCos: f32;
		penumbraCos: f32;
	};

	var<uniform> spotLights: array<SpotLight, NUM_SPOT_LIGHTS>;

	// light is an out parameter as having it as a return value caused compiler errors on some devices
	fn getSpotLightInfo( spotLight: SpotLight, GeometricContext geometry: GeometricContext, light: ptr<function,IncidentLight>) {

		let lVector = spotLight.position - geometry.position;

		(*light).direction = normalize( lVector );

		let angleCos = dot( light.direction, spotLight.direction );

		let spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );

		if ( spotAttenuation > 0.0 ) {

			let lightDistance = length( lVector );

			(*light).color = spotLight.color * spotAttenuation;
			(*light).color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			(*light).visible = ( light.color != vec3<f32>( 0.0 ) );

		} else {

			(*light).color = vec3( 0.0 );
			(*light).visible = false;

		}

	}

#endif


#if NUM_RECT_AREA_LIGHTS > 0

	struct RectAreaLight {
		color: vec3<f32>;
		position: vec3<f32>;
		halfWidth: vec3<f32>;
		halfHeight: vec3<f32>;
	};

	// Pre-computed values of LinearTransformedCosine approximation of BRDF
	// BRDF approximation Texture is 64x64
	// RGBA Float
	var ltc_1: texture_2d<f32>;
	var ltc_1Sampler: sampler;
	// RGBA Float
	var ltc_2: texture_2d<f32>;
	var ltc_2Sampler: sampler;

	var<uniform> rectAreaLights: array<RectAreaLight, NUM_RECT_AREA_LIGHTS>;

#endif


#if NUM_HEMI_LIGHTS > 0

	struct HemisphereLight {
		direction: vec3<f32>;
		skyColor: vec3<f32>;
		groundColor: vec3<f32>;
	};

	var<uniform> hemisphereLights: array<HemisphereLight, NUM_HEMI_LIGHTS>;

	fn getHemisphereLightIrradiance( hemiLight: HemisphereLight, normal: vec3<f32> )->vec3<f32> {

		let dotNL = dot( normal, hemiLight.direction );
		let hemiDiffuseWeight = 0.5 * dotNL + 0.5;

		let irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );

		return irradiance;

	}

#endif
`;
