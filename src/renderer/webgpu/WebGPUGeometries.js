import { Uint16BufferAttribute, Uint32BufferAttribute } from "three";
import { arrayNeedsUint32 } from '../../utils.js';

class WebGPUGeometries {

	constructor( attributes, info ) {

		this.attributes = attributes;
		this.info = info;

		this.geometries = new WeakMap();
		const wireframeAttributes = new WeakMap();
		//
		let updateWireframeAttribute = ( geometry )=> {

			const indices = [];

			const geometryIndex = geometry.index;
			const geometryPosition = geometry.attributes.position;
			let version = 0;

			if ( geometryIndex !== null ) {
				const array = geometryIndex.array;
				version = geometryIndex.version;

				for ( let i = 0, l = array.length; i < l; i += 3 ) {

					const a = array[ i + 0 ];
					const b = array[ i + 1 ];
					const c = array[ i + 2 ];

					indices.push( a, b, b, c, c, a );
				}

			} else {
				const array = geometryPosition.array;
				version = geometryPosition.version;

				for ( let i = 0, l = ( array.length / 3 ) - 1; i < l; i += 3 ) {

					const a = i + 0;
					const b = i + 1;
					const c = i + 2;

					indices.push( a, b, b, c, c, a );
				}
			}

			const attribute = new ( arrayNeedsUint32( indices ) ? Uint32BufferAttribute : Uint16BufferAttribute )( indices, 1 );
			attribute.version = version;

			const previousAttribute = wireframeAttributes.get( geometry );

			if ( previousAttribute ) {
				this.attributes.remove( previousAttribute );
				attributes.remove( previousAttribute );
			}

			//
			wireframeAttributes.set( geometry, attribute );
			this.attributes.update( attribute, true );
		}

		this.getWireframeAttribute = ( geometry )=> {

			const currentAttribute = wireframeAttributes.get( geometry );

			if ( currentAttribute ) {
				const geometryIndex = geometry.index;
				if ( geometryIndex !== null ) {
					// if the attribute is obsolete, create a new one
					if ( currentAttribute.version < geometryIndex.version ) {

						updateWireframeAttribute( geometry );
					}
				}
			} else {
				updateWireframeAttribute( geometry );
			}

			return wireframeAttributes.get( geometry );
		}
	}

	update( geometry ) {

		if ( this.geometries.has( geometry ) === false ) {

			const disposeCallback = onGeometryDispose.bind( this );

			this.geometries.set( geometry, disposeCallback );

			this.info.memory.geometries ++;

			geometry.addEventListener( 'dispose', disposeCallback );

		}

		const geometryAttributes = geometry.attributes;

		for ( const name in geometryAttributes ) {

			this.attributes.update( geometryAttributes[ name ] );

		}

		const index = geometry.index;

		if ( index !== null ) {

			this.attributes.update( index, true );

		}

	}
}

function onGeometryDispose( event ) {

	const geometry = event.target;
	const disposeCallback = this.geometries.get( geometry );

	this.geometries.delete( geometry );

	this.info.memory.geometries --;

	geometry.removeEventListener( 'dispose', disposeCallback );

	//

	const index = geometry.index;
	const geometryAttributes = geometry.attributes;

	if ( index !== null ) {

		this.attributes.remove( index );

	}

	for ( const name in geometryAttributes ) {

		this.attributes.remove( geometryAttributes[ name ] );

	}

}

export default WebGPUGeometries;
