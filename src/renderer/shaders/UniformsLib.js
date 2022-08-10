import { Color, Vector2,  Matrix3} from 'three';

/**
 * Uniforms library for shared webgl/webgpu shaders
 */

const UniformFilter = {
	CAMERA: 'Camera',
	SCENE: 'Scene',
	MATERIAL: 'Material',
	OBJECT: 'Object',
	CUSTOM: 'Custom'
}

const UniformsLib = {

	common: {

		diffuse: { value: new Color( 0xffffff ) },
		opacity: { value: 1.0 },

		map: { value: null },
		uvTransform: { value: new Matrix3() },
		uv2Transform: { value: new Matrix3() },

		alphaMap: { value: null },
		alphaTest: { value: 0 }

	},

	specularmap: {

		specularMap: { value: null },

	},

	envmap: {

		envMap: { value: null },
		flipEnvMap: { value: - 1 },
		reflectivity: { value: 1.0 }, // basic, lambert, phong
		ior: { value: 1.5 }, // standard, physical
		refractionRatio: { value: 0.98 }

	},

	aomap: {

		aoMap: { value: null },
		aoMapIntensity: { value: 1 }

	},

	lightmap: {

		lightMap: { value: null },
		lightMapIntensity: { value: 1 }

	},

	emissivemap: {

		emissiveMap: { value: null }

	},

	bumpmap: {

		bumpMap: { value: null },
		bumpScale: { value: 1 }

	},

	normalmap: {

		normalMap: { value: null },
		normalScale: { value: new Vector2( 1, 1 ) }

	},

	displacementmap: {

		displacementMap: { value: null },
		displacementScale: { value: 1 },
		displacementBias: { value: 0 }

	},

	roughnessmap: {

		roughnessMap: { value: null }

	},

	metalnessmap: {

		metalnessMap: { value: null }

	},

	gradientmap: {

		gradientMap: { value: null }

	},

	fog: {

		fogDensity: { value: 0.00025  , filter: UniformFilter.SCENE},
		fogNear: { value: 1 , filter: UniformFilter.SCENE},
		fogFar: { value: 2000 , filter: UniformFilter.SCENE},
		fogColor: { value: new Color( 0xffffff ) , filter: UniformFilter.SCENE}

	},

	lights: {

		ambientLightColor: { value: [] , filter: UniformFilter.SCENE},

		lightProbe: { value: [] , filter: UniformFilter.SCENE},

		directionalLights: { value: [], properties: {
			direction: {},
			color: {}
		} , filter: UniformFilter.SCENE},

		directionalLightShadows: { value: [], properties: {
			shadowBias: {},
			shadowNormalBias: {},
			shadowRadius: {},
			shadowMapSize: {}
		} , filter: UniformFilter.SCENE},

		directionalShadowMap: { value: [] , filter: UniformFilter.SCENE},
		directionalShadowMatrix: { value: [] , filter: UniformFilter.SCENE},

		spotLights: { value: [], properties: {
			color: {},
			position: {},
			direction: {},
			distance: {},
			coneCos: {},
			penumbraCos: {},
			decay: {}
		} , filter: UniformFilter.SCENE},

		spotLightShadows: { value: [], properties: {
			shadowBias: {},
			shadowNormalBias: {},
			shadowRadius: {},
			shadowMapSize: {}
		} , filter: UniformFilter.SCENE},

		spotShadowMap: { value: [] , filter: UniformFilter.SCENE},
		spotShadowMatrix: { value: [] , filter: UniformFilter.SCENE},

		pointLights: { value: [], properties: {
			color: {},
			position: {},
			decay: {},
			distance: {}
		} , filter: UniformFilter.SCENE},

		pointLightShadows: { value: [], properties: {
			shadowBias: {},
			shadowNormalBias: {},
			shadowRadius: {},
			shadowMapSize: {},
			shadowCameraNear: {},
			shadowCameraFar: {}
		} , filter: UniformFilter.SCENE},

		pointShadowMap: { value: [] , filter: UniformFilter.SCENE},
		pointShadowMatrix: { value: [] , filter: UniformFilter.SCENE},

		hemisphereLights: { value: [], properties: {
			direction: {},
			skyColor: {},
			groundColor: {}
		} , filter: UniformFilter.SCENE},

		// TODO (abelnation): RectAreaLight BRDF data needs to be moved from example to main Core
		rectAreaLights: { value: [], properties: {
			color: {},
			position: {},
			width: {},
			height: {}
		} , filter: UniformFilter.SCENE},

		ltc_1: { value: null , filter: UniformFilter.SCENE},
		ltc_2: { value: null , filter: UniformFilter.SCENE}

	},

	points: {

		diffuse: { value: new Color( 0xffffff ) },
		opacity: { value: 1.0 },
		size: { value: 1.0 },
		scale: { value: 1.0 },
		map: { value: null },
		alphaMap: { value: null },
		alphaTest: { value: 0 },
		uvTransform: { value: new Matrix3() }

	},

	sprite: {

		diffuse: { value: new Color( 0xffffff ) },
		opacity: { value: 1.0 },
		center: { value: new Vector2( 0.5, 0.5 ) },
		rotation: { value: 0.0 },
		map: { value: null },
		alphaMap: { value: null },
		alphaTest: { value: 0 },
		uvTransform: { value: new Matrix3() }

	}

};

export { UniformFilter, UniformsLib };
