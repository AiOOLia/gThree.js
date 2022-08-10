class WebGPUBindGroupLayouts{
    constructor(device) {
        let cache = new Map();
        //
        let getCacheKey = (bindGroupLayoutEntries)=>{
            let key = '';
            for(let i=0, ln = bindGroupLayoutEntries.length; i<ln; ++i) {
                const entry = bindGroupLayoutEntries[i];
                key += entry.binding + entry.visibility;
                if(entry.buffer) {
                    key += entry.buffer.type + entry.buffer.hasDynamicOffset+entry.buffer.minBindingSize;
                } else if(entry.sampler) {
                    key += entry.sampler.type;
                } else if(entry.texture) {
                    key += entry.texture.sampleType + entry.texture.viewDimension + entry.texture.multisampled;
                } else if(entry.storageTexture) {
                    key += entry.storageTexture.access + entry.storageTexture.format + entry.storageTexture.viewDimension;
                } else if(entry.externalTfexture) {

                }
            }
            //
            return key;
        }
        this.get = (bindGroupLayoutEntries)=>{
            let bindGroupLayouts = [];
            let key = '';
            for(let i=0; i<bindGroupLayoutEntries.length; ++i) {
                const cacheKey = getCacheKey(bindGroupLayoutEntries[i]);
                if(cache.has(cacheKey)) {
                    bindGroupLayouts.push(cache.get(cacheKey));
                } else {
                    let bindGroupLayout = device.createBindGroupLayout({entries: bindGroupLayoutEntries[i]});
                    cache.set(cacheKey, bindGroupLayout);
                    //
                    bindGroupLayouts.push(bindGroupLayout);
                }
                key += cacheKey;
            }
            return {cacheKey: key, bindGroupLayouts: bindGroupLayouts};
        }
    }
}

export  default WebGPUBindGroupLayouts;
