export default /* wgsl */`

fn LinearToLinear( value: vec4<f32> )->vec4<f32> {
	return value;
}

fn LinearTosRGB( value: vec4<f32> )->vec4<f32> {
	return vec4<f32>( mix( pow( value.rgb, vec3<f32>( 0.41666 ) ) * 1.055 - vec3<f32>( 0.055 ), value.rgb * 12.92, vec3<f32>( lessThanEqual( value.rgb, vec3<f32>( 0.0031308 ) ) ) ), value.a );
}

`;
