import { Color, Matrix4, Vector2, Vector3 } from "three";
import { UniformsLib } from '../shaders/UniformsLib.js';

function UniformsCache() {

	const lights = {};

	return {

		get: function ( light ) {

			if ( lights[ light.id ] !== undefined ) {

				return lights[ light.id ];

			}

			let uniforms;

			switch ( light.type ) {

				case 'DirectionalLight':
					uniforms = {
						direction: new Vector3(),
						color: new Color()
					};
					break;

				case 'SpotLight':
					uniforms = {
						position: new Vector3(),
						direction: new Vector3(),
						color: new Color(),
						distance: 0,
						coneCos: 0,
						penumbraCos: 0,
						decay: 0
					};
					break;

				case 'PointLight':
					uniforms = {
						position: new Vector3(),
						color: new Color(),
						distance: 0,
						decay: 0
					};
					break;

				case 'HemisphereLight':
					uniforms = {
						direction: new Vector3(),
						skyColor: new Color(),
						groundColor: new Color()
					};
					break;

				case 'RectAreaLight':
					uniforms = {
						color: new Color(),
						position: new Vector3(),
						halfWidth: new Vector3(),
						halfHeight: new Vector3()
					};
					break;

			}

			lights[ light.id ] = uniforms;

			return uniforms;

		}

	};

}

function ShadowUniformsCache() {

	const lights = {};

	return {

		get: function ( light ) {

			if ( lights[ light.id ] !== undefined ) {

				return lights[ light.id ];

			}

			let uniforms;

			switch ( light.type ) {

				case 'DirectionalLight':
					uniforms = {
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2()
					};
					break;

				case 'SpotLight':
					uniforms = {
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2()
					};
					break;

				case 'PointLight':
					uniforms = {
						shadowBias: 0,
						shadowNormalBias: 0,
						shadowRadius: 1,
						shadowMapSize: new Vector2(),
						shadowCameraNear: 1,
						shadowCameraFar: 1000
					};
					break;

				// TODO (abelnation): set RectAreaLight shadow uniforms

			}

			lights[ light.id ] = uniforms;

			return uniforms;

		}

	};

}



let nextVersion = 0;

function shadowCastingLightsFirst( lightA, lightB ) {

	return ( lightB.castShadow ? 1 : 0 ) - ( lightA.castShadow ? 1 : 0 );

}

class WebGPULights {
	constructor() {
		const cache = new UniformsCache();

		const shadowCache = ShadowUniformsCache();


		this.version = 0;

		this.hash =  {
				directionalLength: - 1,
				pointLength: - 1,
				spotLength: - 1,
				rectAreaLength: - 1,
				hemiLength: - 1,

				numDirectionalShadows: - 1,
				numPointShadows: - 1,
				numSpotShadows: - 1
			};

		this.ambient = [ 0, 0, 0 ];
	    this.probe = [];
		this.directional = [];
		this.directionalShadow = [];
		this.directionalShadowMap = [];
		this.directionalShadowMatrix = [];
		this.spot = [];
		this.spotShadow = [];
		this.spotShadowMap = [];
		this.spotShadowMatrix = [];
		this.rectArea = [];
		this.rectAreaLTC1 = null;
		this.rectAreaLTC2 = null;
		this.point = [];
		this.pointShadow = [];
		this.pointShadowMap = [];
		this.pointShadowMatrix = [];
		this.hemi = [];


		for ( let i = 0; i < 9; i ++ ) this.probe.push( new Vector3() );

		const vector3 = new Vector3();
		const matrix4 = new Matrix4();
		const matrix42 = new Matrix4();

		this.setup = ( lights, physicallyCorrectLights )=> {

			let r = 0, g = 0, b = 0;

			for ( let i = 0; i < 9; i ++ ) this.probe[ i ].set( 0, 0, 0 );

			let directionalLength = 0;
			let pointLength = 0;
			let spotLength = 0;
			let rectAreaLength = 0;
			let hemiLength = 0;

			let numDirectionalShadows = 0;
			let numPointShadows = 0;
			let numSpotShadows = 0;

			lights.sort( shadowCastingLightsFirst );

			// artist-friendly light intensity scaling factor
			const scaleFactor = ( physicallyCorrectLights !== true ) ? Math.PI : 1;

			for ( let i = 0, l = lights.length; i < l; i ++ ) {

				const light = lights[ i ];

				const color = light.color;
				const intensity = light.intensity;
				const distance = light.distance;

				const shadowMap = ( light.shadow && light.shadow.map ) ? light.shadow.map.texture : null;

				if ( light.isAmbientLight ) {

					r += color.r * intensity * scaleFactor;
					g += color.g * intensity * scaleFactor;
					b += color.b * intensity * scaleFactor;

				} else if ( light.isLightProbe ) {

					for ( let j = 0; j < 9; j ++ ) {

						this.probe[ j ].addScaledVector( light.sh.coefficients[ j ], intensity );

					}

				} else if ( light.isDirectionalLight ) {

					const uniforms = cache.get( light );

					uniforms.color.copy( light.color ).multiplyScalar( light.intensity * scaleFactor );

					if ( light.castShadow ) {

						const shadow = light.shadow;

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;

						this.directionalShadow[ directionalLength ] = shadowUniforms;
						this.directionalShadowMap[ directionalLength ] = shadowMap;
						this.directionalShadowMatrix[ directionalLength ] = light.shadow.matrix;

						numDirectionalShadows ++;

					}

					this.directional[ directionalLength ] = uniforms;

					directionalLength ++;

				} else if ( light.isSpotLight ) {

					const uniforms = cache.get( light );

					uniforms.position.setFromMatrixPosition( light.matrixWorld );

					uniforms.color.copy( color ).multiplyScalar( intensity * scaleFactor );
					uniforms.distance = distance;

					uniforms.coneCos = Math.cos( light.angle );
					uniforms.penumbraCos = Math.cos( light.angle * ( 1 - light.penumbra ) );
					uniforms.decay = light.decay;

					if ( light.castShadow ) {

						const shadow = light.shadow;

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;

						this.spotShadow[ spotLength ] = shadowUniforms;
						this.spotShadowMap[ spotLength ] = shadowMap;
						this.spotShadowMatrix[ spotLength ] = light.shadow.matrix;

						numSpotShadows ++;

					}

					this.spot[ spotLength ] = uniforms;

					spotLength ++;

				} else if ( light.isRectAreaLight ) {

					const uniforms = cache.get( light );

					// (a) intensity is the total visible light emitted
					//uniforms.color.copy( color ).multiplyScalar( intensity / ( light.width * light.height * Math.PI ) );

					// (b) intensity is the brightness of the light
					uniforms.color.copy( color ).multiplyScalar( intensity );

					uniforms.halfWidth.set( light.width * 0.5, 0.0, 0.0 );
					uniforms.halfHeight.set( 0.0, light.height * 0.5, 0.0 );

					this.rectArea[ rectAreaLength ] = uniforms;

					rectAreaLength ++;

				} else if ( light.isPointLight ) {

					const uniforms = cache.get( light );

					uniforms.color.copy( light.color ).multiplyScalar( light.intensity * scaleFactor );
					uniforms.distance = light.distance;
					uniforms.decay = light.decay;

					if ( light.castShadow ) {

						const shadow = light.shadow;

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;
						shadowUniforms.shadowCameraNear = shadow.camera.near;
						shadowUniforms.shadowCameraFar = shadow.camera.far;

						this.pointShadow[ pointLength ] = shadowUniforms;
						this.pointShadowMap[ pointLength ] = shadowMap;
						this.pointShadowMatrix[ pointLength ] = light.shadow.matrix;

						numPointShadows ++;

					}

					this.point[ pointLength ] = uniforms;

					pointLength ++;

				} else if ( light.isHemisphereLight ) {

					const uniforms = cache.get( light );

					uniforms.skyColor.copy( light.color ).multiplyScalar( intensity * scaleFactor );
					uniforms.groundColor.copy( light.groundColor ).multiplyScalar( intensity * scaleFactor );

					this.hemi[ hemiLength ] = uniforms;

					hemiLength ++;

				}

			}

			if ( rectAreaLength > 0 ) {
				this.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1;
				this.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2;
			}

			this.ambient[ 0 ] = r;
			this.ambient[ 1 ] = g;
			this.ambient[ 2 ] = b;

			const hash = this.hash;

			if ( hash.directionalLength !== directionalLength ||
				hash.pointLength !== pointLength ||
				hash.spotLength !== spotLength ||
				hash.rectAreaLength !== rectAreaLength ||
				hash.hemiLength !== hemiLength ||
				hash.numDirectionalShadows !== numDirectionalShadows ||
				hash.numPointShadows !== numPointShadows ||
				hash.numSpotShadows !== numSpotShadows ) {

				this.directional.length = directionalLength;
				this.spot.length = spotLength;
				this.rectArea.length = rectAreaLength;
				this.point.length = pointLength;
				this.hemi.length = hemiLength;

				this.directionalShadow.length = numDirectionalShadows;
				this.directionalShadowMap.length = numDirectionalShadows;
				this.pointShadow.length = numPointShadows;
				this.pointShadowMap.length = numPointShadows;
				this.spotShadow.length = numSpotShadows;
				this.spotShadowMap.length = numSpotShadows;
				this.directionalShadowMatrix.length = numDirectionalShadows;
				this.pointShadowMatrix.length = numPointShadows;
				this.spotShadowMatrix.length = numSpotShadows;

				hash.directionalLength = directionalLength;
				hash.pointLength = pointLength;
				hash.spotLength = spotLength;
				hash.rectAreaLength = rectAreaLength;
				hash.hemiLength = hemiLength;

				hash.numDirectionalShadows = numDirectionalShadows;
				hash.numPointShadows = numPointShadows;
				hash.numSpotShadows = numSpotShadows;

				this.version = nextVersion ++;

			}

		}

		this.setupView = ( lights, camera )=> {

			let directionalLength = 0;
			let pointLength = 0;
			let spotLength = 0;
			let rectAreaLength = 0;
			let hemiLength = 0;

			const viewMatrix = camera.matrixWorldInverse;

			for ( let i = 0, l = lights.length; i < l; i ++ ) {

				const light = lights[ i ];

				if ( light.isDirectionalLight ) {

					const uniforms = this.directional[ directionalLength ];

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					vector3.setFromMatrixPosition( light.target.matrixWorld );
					uniforms.direction.sub( vector3 );
					uniforms.direction.transformDirection( viewMatrix );

					directionalLength ++;

				} else if ( light.isSpotLight ) {

					const uniforms = this.spot[ spotLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					vector3.setFromMatrixPosition( light.target.matrixWorld );
					uniforms.direction.sub( vector3 );
					uniforms.direction.transformDirection( viewMatrix );

					spotLength ++;

				} else if ( light.isRectAreaLight ) {

					const uniforms = this.rectArea[ rectAreaLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					// extract local rotation of light to derive width/height half vectors
					matrix42.identity();
					matrix4.copy( light.matrixWorld );
					matrix4.premultiply( viewMatrix );
					matrix42.extractRotation( matrix4 );

					uniforms.halfWidth.set( light.width * 0.5, 0.0, 0.0 );
					uniforms.halfHeight.set( 0.0, light.height * 0.5, 0.0 );

					uniforms.halfWidth.applyMatrix4( matrix42 );
					uniforms.halfHeight.applyMatrix4( matrix42 );

					rectAreaLength ++;

				} else if ( light.isPointLight ) {

					const uniforms = this.point[ pointLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					pointLength ++;

				} else if ( light.isHemisphereLight ) {

					const uniforms = this.hemi[ hemiLength ];

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					uniforms.direction.transformDirection( viewMatrix );
					uniforms.direction.normalize();

					hemiLength ++;
				}

			}

		}
	}

}


export { WebGPULights };
