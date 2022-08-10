export default /* wgsl */`
#ifdef DITHERING

	// based on https://www.shadertoy.com/view/MslGR8
	fn dithering( color: vec3<f32> )->vec3<f32> {
		//Calculate grid position
		let grid_position = rand( gl_FragCoord.xy );

		//Shift the individual colors differently, thus making it even harder to see the dithering pattern
		var dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );

		//modify shift acording to grid position.
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );

		//shift the color by dither_shift
		return color + dither_shift_RGB;
	}

#endif
`;
