import { Texture } from 'three';
import { ImageBitmapLoader } from 'three';
import { Loader } from 'three';

class TextureLoader extends Loader {

    constructor( manager ) {

        super( manager );

    }

    load( url, onLoad, onProgress, onError ) {

        const texture = new Texture();

        const loader = new ImageBitmapLoader( this.manager );
        loader.setCrossOrigin( this.crossOrigin );
        loader.setPath( this.path );

        loader.load( url, function ( image ) {

            texture.image = image;
            texture.needsUpdate = true;

            if ( onLoad !== undefined ) {

                onLoad( texture );

            }

        }, onProgress, onError );

        return texture;

    }

}


export { TextureLoader };
