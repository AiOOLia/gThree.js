export default /* wgsl */`
struct IncidentLight {
	color: vec3<f32>;
	direction: vec3<f32>;
	visible: i32;
};

struct ReflectedLight {
	directDiffuse: vec3<f32>;
	directSpecular: vec3<f32>;
	indirectDiffuse: vec3<f32>;
	indirectSpecular: vec3<f32>;
};

struct GeometricContext {
	position: vec3<f32>;
	normal: vec3<f32>;
	viewDir: vec3<f32>;
#ifdef USE_CLEARCOAT
	clearcoatNormal: vec3<f32>;
#endif
};

fn transformDirection( dir:vec3<f32>, matrix:mat4x4<f32> )->vec3<f32> {

	return normalize( ( matrix * vec4<f32>( dir, 0.0 ) ).xyz );

}

fn inverseTransformDirection( dir:vec3<f32>, matrix:mat4x4<f32> )->vec3<f32> {

	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize( ( vec4<f32>( dir, 0.0 ) * matrix ).xyz );

}

fn transposeMat3( m: mat3x3<f32> )->mat3x3<f32> {

	var tmp: mat3x3<f32>;

	tmp[ 0 ] = vec3<f32>( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3<f32>( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3<f32>( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );

	return tmp;

}
`;
