let _id = 0;

class WebGPUShaderCache {

    constructor() {

        this.shaderCache = new Map();
        this.materialCache = new Map();

    }

    update( material ) {

        const vertexShader = material.vertexShader;
        const fragmentShader = material.fragmentShader;

        const vertexShaderStage = this._getShaderItem( vertexShader );
        const fragmentShaderStage = this._getShaderItem( fragmentShader );

        const materialShaders = this._getShaderCacheForMaterial( material );

        if ( materialShaders.has( vertexShaderStage ) === false ) {

            materialShaders.add( vertexShaderStage );
            vertexShaderStage.usedTimes ++;
        }

        if ( materialShaders.has( fragmentShaderStage ) === false ) {

            materialShaders.add( fragmentShaderStage );
            fragmentShaderStage.usedTimes ++;
        }

        return this;

    }

    remove( material ) {

        const materialShaders = this.materialCache.get( material );

        for ( const shaderStage of materialShaders ) {

            shaderStage.usedTimes --;

            if ( shaderStage.usedTimes === 0 ) this.shaderCache.delete( shaderStage );

        }

        this.materialCache.delete( material );

        return this;

    }

    getVertexShaderID( material ) {

        return this._getShaderItem( material.vertexShader ).id;

    }

    getFragmentShaderID( material ) {

        return this._getShaderItem( material.fragmentShader ).id;

    }

    getComputeShaderID( computeShader ) {

        return this._getShaderItem( computeShader ).id;

    }

    dispose() {

        this.shaderCache.clear();
        this.materialCache.clear();

    }

    _getShaderCacheForMaterial( material ) {

        const cache = this.materialCache;

        if ( cache.has( material ) === false ) {

            cache.set( material, new Set() );

        }

        return cache.get( material );

    }

    _getShaderItem( code ) {

        const cache = this.shaderCache;

        if ( cache.has( code ) === false ) {

            const item = new WebGPUShaderItem();
            cache.set( code, item );

        }

        return cache.get( code );

    }

}

class WebGPUShaderItem {

    constructor() {

        this.id = _id ++;

        this.usedTimes = 0;

    }

}

export { WebGPUShaderCache };
