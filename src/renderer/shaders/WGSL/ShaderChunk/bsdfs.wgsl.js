export default /* wgsl */`

fn BRDF_Lambert( diffuseColor: vec3<f32> )->vec3<f32> {

	return RECIPROCAL_PI * diffuseColor;

} // validated

fn F_Schlick( f0: vec3<f32>, f90: f32, dotVH: f32 )->vec3<f32> {

	// Original approximation by Christophe Schlick '94
	// float fresnel = pow( 1.0 - dotVH, 5.0 );

	// Optimized variant (presented by Epic at SIGGRAPH '13)
	// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	let fresnel: f32 = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );

	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );

} // validated

// Moving Frostbite to Physically Based Rendering 3.0 - page 12, listing 2
// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
fn V_GGX_SmithCorrelated( alpha: f32, dotNL: f32, dotNV: f32 )->f32 {

	let a2 = pow2( alpha );

	let gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	let gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );

	return 0.5 / max( gv + gl, EPSILON );

}

// Microfacet Models for Refraction through Rough Surfaces - equation (33)
// http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
// alpha is "roughness squared" in Disney’s reparameterization
fn D_GGX( alpha: f32, dotNH: f32 )->f32 {

	let a2 = pow2( alpha );

	let denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0; // avoid alpha = 0 with dotNH = 1

	return RECIPROCAL_PI * a2 / pow2( denom );

}

// GGX Distribution, Schlick Fresnel, GGX_SmithCorrelated Visibility
fn BRDF_GGX( lightDir: vec3<f32>, viewDir: vec3<f32>, normal: vec3<f32>, f0: vec3<f32>, f90: f32, roughness: f32 )->vec3<f32> {

	let alpha = pow2( roughness ); // UE4's roughness

	let halfDir = normalize( lightDir + viewDir );

	let dotNL = saturate( dot( normal, lightDir ) );
	let dotNV = saturate( dot( normal, viewDir ) );
	let dotNH = saturate( dot( normal, halfDir ) );
	let dotVH = saturate( dot( viewDir, halfDir ) );

	let F: vec3<f32> = F_Schlick( f0, f90, dotVH );

	let V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );

	let D = D_GGX( alpha, dotNH );

	return F * ( V * D );

}

// Rect Area Light

// Real-Time Polygonal-Light Shading with Linearly Transformed Cosines
// by Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt
// code: https://github.com/selfshadow/ltc_code/

fn LTC_Uv( N: vec3<f32>, V: vec3<f32>, roughness: f32 )->vec2<f32> {

	let LUT_SIZE = 64.0;
	let LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	let LUT_BIAS = 0.5 / LUT_SIZE;

	let dotNV = saturate( dot( N, V ) );

	// texture parameterized by sqrt( GGX alpha ) and sqrt( 1 - cos( theta ) )
	var uv = vec2( roughness, sqrt( 1.0 - dotNV ) );

	uv = uv * LUT_SCALE + LUT_BIAS;

	return uv;

}

fn LTC_ClippedSphereFormFactor( f: vec3<f32>  )->f32 {

	// Real-Time Area Lighting: a Journey from Research to Production (p.102)
	// An approximation of the form factor of a horizon-clipped rectangle.

	let l = length( f );

	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );

}

fn LTC_EdgeVectorFormFactor( v1: vec3<f32>, v2: vec3<f32> )->vec3<f32> {

	let x = dot( v1, v2 );

	let y = abs( x );

	// rational polynomial approximation to theta / sin( theta ) / 2PI
	let a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	let b = 3.4175940 + ( 4.1616724 + y ) * y;
	let v = a / b;

	var theta_sintheta = v;
	if(x <= 0.0) {
	   theta_sintheta = 0.5 * inverseSqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	}

	return cross( v1, v2 ) * theta_sintheta;

}

fn LTC_Evaluate( N: vec3<f32>, V: vec3<f32>, P: vec3<f32>, mInv: mat3x3<f32>, rectCoords: array<vec3<f32>,4> )->vec3<f32> {

	// bail if point is on back side of plane of light
	// assumes ccw winding order of light vertices
	let v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	let v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	let lightNormal = cross( v1, v2 );

	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) {
	   return vec3( 0.0 );
	}

	// construct orthonormal basis around N
	let T1 = normalize( V - N * dot( V, N ) );
	let T2 = - cross( N, T1 ); // negated from paper; possibly due to a different handedness of world coordinate system

	// compute transform
	var transform: mat3x3<f32> = mInv * transposeMat3( mat3x3<f32>( T1, T2, N ) );

	// transform rect
	var coords: array<vec3<f32>, 4>;
	coords[ 0 ] = transform * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = transform * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = transform * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = transform * ( rectCoords[ 3 ] - P );

	// project rect onto sphere
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );

	// calculate vector form factor
	var vectorFormFactor = vec3<f32>( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );

	// adjust for horizon clipping
	let result = LTC_ClippedSphereFormFactor( vectorFormFactor );

/*
	// alternate method of adjusting for horizon clipping (see referece)
	// refactoring required
	let len = length( vectorFormFactor );
	let z = vectorFormFactor.z / len;

	let LUT_SIZE = 64.0;
	let LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	let LUT_BIAS = 0.5 / LUT_SIZE;

	// tabulated horizon-clipped sphere, apparently...
	var uv = vec2( z * 0.5 + 0.5, len );
	uv = uv * LUT_SCALE + LUT_BIAS;

	let scale = texture2D( ltc_2, uv ).w;

	let result = len * scale;
*/

	return vec3( result );

}

// End Rect Area Light


fn G_BlinnPhong_Implicit( /* const in float dotNL, const in float dotNV */ )->f32 {

	// geometry term is (n dot l)(n dot v) / 4(n dot l)(n dot v)
	return 0.25;

}

fn D_BlinnPhong( shininess: f32, dotNH: f32 )->f32 {

	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );

}

fn BRDF_BlinnPhong( lightDir: vec3<f32>, viewDir: vec3<f32>, normal: vec3<f32>, specularColor: vec3<f32>, shininess: f32 )->vec3<f32> {

	let halfDir = normalize( lightDir + viewDir );

	let dotNH = saturate( dot( normal, halfDir ) );
	let dotVH = saturate( dot( viewDir, halfDir ) );

	let F = F_Schlick( specularColor, 1.0, dotVH );

	let G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );

	let D = D_BlinnPhong( shininess, dotNH );

	return F * ( G * D );

} // validated

#if defined( USE_SHEEN )

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs
fn D_Charlie( roughness: f32, dotNH: f32 )->f32 {

	let alpha = pow2( roughness );

	// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
	let invAlpha = 1.0 / alpha;
	let cos2h = dotNH * dotNH;
	let sin2h = max( 1.0 - cos2h, 0.0078125 ); // 2^(-14/2), so sin2h^2 > 0 in fp16

	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );

}

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs
fn V_Neubelt( dotNV: f32, dotNL: f32 )->f32 {

	// Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );

}

fn BRDF_Sheen( lightDir: vec3<f32>, viewDir: vec3<f32>, normal: vec3<f32>, sheenColor: vec3<f32>, sheenRoughness: f32 )->vec3<f32> {

	let halfDir = normalize( lightDir + viewDir );

	let dotNL = saturate( dot( normal, lightDir ) );
	let dotNV = saturate( dot( normal, viewDir ) );
	let dotNH = saturate( dot( normal, halfDir ) );

	let D = D_Charlie( sheenRoughness, dotNH );
	let V = V_Neubelt( dotNV, dotNL );

	return sheenColor * ( D * V );

}

#endif
`;
