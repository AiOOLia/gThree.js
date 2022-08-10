export default /* wgsl */`
fn packNormalToRGB( normal: vec3<f32> )->vec3<f32> {
	return normalize( normal ) * 0.5 + 0.5;
}

fn unpackRGBToNormal( rgb: vec3<f32> )->vec3<f32> {
	return 2.0 * rgb.xyz - 1.0;
}

const PackUpscale = 1.00392156862; //256.0 / 255.0;
const UnpackDownscale = 0.99609375; //255.0 / 256.0;

const PackFactors = vec3<f32>( 16777216.0, 65536.0, 256.0 ); //vec3<f32>( 256.0*256.0*256.0, 256.0*256.0, 256.0 )
const UnpackFactors = vec4<f32>(0.000000059371814131736755, 0.0000151991844177246, 0.0038909912109375, 0.99609375); //UnpackDownscale / vec4( PackFactors, 1.0 );

const ShiftRight8 = 0.00390625; //1.0 / 256.0;

fn packDepthToRGBA( v: f32 )->vec4<f32> {
	var r  = vec4<f32>( fract( v * PackFactors ), v );
	r = vec4<f32>(r.x, r.yzw - r.xyz * ShiftRight8); // tidy overflow
	return r * PackUpscale;
}

fn unpackRGBAToDepth( v: vec4<f32> )->f32 {
	return dot( v, UnpackFactors );
}

fn pack2HalfToRGBA( v: vec2<f32> )->vec4<f32> {
	let r = vec4<f32>( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4<f32>( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}

fn unpackRGBATo2Half( v: vec4<f32> )->vec2<f32> {
	return vec2<f32>( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}

// NOTE: viewZ/eyeZ is < 0 when in front of the camera per OpenGL conventions

fn viewZToOrthographicDepth( viewZ: f32, near: f32, far: f32 )->f32 {
	return ( viewZ + near ) / ( near - far );
}
fn orthographicDepthToViewZ( linearClipZ: f32, near: f32, far: f32 )->f32 {
	return linearClipZ * ( near - far ) - near;
}

// NOTE: https://twitter.com/gonnavis/status/1377183786949959682

fn viewZToPerspectiveDepth( viewZ: f32, near: f32, far: f32 )->f32 {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
fn perspectiveDepthToViewZ( invClipZ: f32, near: f32, far: f32 )->f32 {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}
`;
