export default /* wgsl */`
var diffuse = vec3<f32>( 1.0 );

var geometry: GeometricContext;
geometry.position = mvPosition.xyz;
geometry.normal = normalize( transformedNormal );
if isOrthographic==1 {
   geometry.viewDir = vec3<f32>( 0.0, 0.0, 1.0 ) ;
} else {
   geometry.viewDir = normalize( -mvPosition.xyz );
}


var backGeometry: GeometricContext;
backGeometry.position = geometry.position;
backGeometry.normal = -geometry.normal;
backGeometry.viewDir = geometry.viewDir;

vLightFront = vec3<f32>( 0.0 );
vIndirectFront = vec3<f32>( 0.0 );
#ifdef DOUBLE_SIDED
	vLightBack = vec3<f32>( 0.0 );
	vIndirectBack = vec3<f32>( 0.0 );
#endif

var directLight: IncidentLight;
var dotNL: f32;
var directLightColor_Diffuse: vec3<f32>;

vIndirectFront += getAmbientLightIrradiance( ambientLightColor );

vIndirectFront += getLightProbeIrradiance( lightProbe, geometry.normal, viewMatrix );

#ifdef DOUBLE_SIDED

	vIndirectBack += getAmbientLightIrradiance( ambientLightColor );

	vIndirectBack += getLightProbeIrradiance( lightProbe, backGeometry.normal, viewMatrix );

#endif

#if NUM_POINT_LIGHTS > 0

	#pragma unroll_loop_start
	for ( var i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

		getPointLightInfo( pointLights[ i ], geometry, &directLight );

		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;

		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;

		#ifdef DOUBLE_SIDED

			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;

		#endif

	}
	#pragma unroll_loop_end

#endif

#if NUM_SPOT_LIGHTS > 0

	#pragma unroll_loop_start
	for ( var i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

		getSpotLightInfo( spotLights[ i ], geometry, &directLight );

		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;

		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;

		#ifdef DOUBLE_SIDED

			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;

		#endif
	}
	#pragma unroll_loop_end

#endif

#if NUM_DIR_LIGHTS > 0

	#pragma unroll_loop_start
	for ( var i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		getDirectionalLightInfo( directionalLights[ i ], geometry, &directLight );

		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;

		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;

		#ifdef DOUBLE_SIDED

			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;

		#endif

	}
	#pragma unroll_loop_end

#endif

#if NUM_HEMI_LIGHTS > 0

	#pragma unroll_loop_start
	for ( var i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

		vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );

		#ifdef DOUBLE_SIDED

			vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry.normal );

		#endif

	}
	#pragma unroll_loop_end

#endif
`;
