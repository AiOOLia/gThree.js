export default /* wgsl */`
const PI = 3.141592653589793;
const PI2 = 6.283185307179586;
const PI_HALF = 1.5707963267948966;
const RECIPROCAL_PI = 0.3183098861837907;
const RECIPROCAL_PI2 = 0.15915494309189535;
const EPSILON = 1e-6;

fn saturate(a:f32)->f32 { return clamp(a, 0.0, 1.0); }
fn whiteComplement(a:f32)->f32 { return 1.0 - saturate(a); }

fn pow2( x:f32 )->f32 { return x*x; }
fn pow3( x:f32 )->f32 { return x*x*x; }
fn pow4( x:f32 )->f32 { let x2 : f32 = x*x; return x2*x2; }
fn max3( v: vec3<f32> )->f32 { return max( max( v.x, v.y ), v.z ); }
fn average( color: vec3<f32> )->f32 { return dot( color, vec3<f32>( 0.3333 ) ); }

fn modulo(x:f32, y:f32)->f32{ return x - y*floor(x/y); }

// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
fn rand( uv:vec2<f32> )->f32 {

	let a = 12.9898;
	let b = 78.233;
	let c = 43758.5453;
	let dt : f32 = dot( uv.xy, vec2( a,b ) );
	let sn = modulo( dt, PI );

	return fract( sin( sn ) * c );
}


// https://en.wikipedia.org/wiki/Relative_luminance
fn linearToRelativeLuminance( color:vec3<f32> )->f32 {

	let weights = vec3<f32>( 0.2126, 0.7152, 0.0722 );

	return dot( weights, color.rgb );

}

fn isPerspectiveMatrix(  m:mat4x4<f32> )->bool {
	return m[ 2 ][ 3 ] == - 1.0;
}

fn equirectUv( dir:vec3<f32> )->vec2<f32> {

	// dir is assumed to be unit length

	let u: f32 = atan2( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;

	let v: f32 = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;

	return vec2<f32>( u, v );
}

fn lessThanEqual(a:vec3<f32>, b:vec3<f32>)->vec3<f32> {
    var x: f32 = 0.0;
if(a.x <= b.x) {x = 1.0;}
var y: f32 = 0.0;
if(a.y <= b.y) {y = 1.0;}
var z: f32 = 0.0;
if(a.z <= b.z) {z = 1.0;}
return vec3<f32>(x, y, z);
}
`;
