import {MathUtils} from "three";

class WebGPUChunkedUniformBuffer {
    constructor(device) {
        this.uuid = MathUtils.generateUUID();
        this._device = device;
        //
        this.elementByteLength = 0;
        this.alignedEleByteLength = 0;
        this.localBuffers = [];
        this.gpuBuffers = [];
        //
        let freeItms = [];
        let usedItms = new WeakMap();

        this.init = (elementByteLength, numItm, alignSize, maxBufferSize, itmPerChunk = 100)=>{
            debugger;
            this.elementByteLength = elementByteLength;
            this.alignedEleByteLength = alignSize*Math.ceil(elementByteLength/alignSize);
            this.maxChunkBufferSize = maxBufferSize;
            const maxPerChunk = Math.floor(maxBufferSize/this.alignedEleByteLength);
            this.localBuffers =[];
            this.gpuBuffers = [];
            let total = 0;
            let numChunk = 0;
            while(total < numItm) {
                const numEle = Math.max(itmPerChunk, Math.min(numItm-total, maxPerChunk));
                const localBuffer = new Uint16Array(numEle*this.alignedEleByteLength/2);
                this.localBuffers.push(localBuffer);
                this.gpuBuffers.push(
                    device.createBuffer( {
                        size: localBuffer.byteLength,
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
                    } )
                );
                //
                for(let i=0; i<numEle; ++i) {
                    freeItms[freeItms.length] = {chunkId: numChunk, offset: i*this.alignedEleByteLength};
                }
                //
                numChunk++;
                total+=numEle;
            }
            //
            this.itmPerChunk = Math.min(itmPerChunk, maxPerChunk);
        }

        this.getBindingInfo = (object)=>{
            if(usedItms.has(object)) {
                return usedItms.get(object);
            }
            return null;
        }

        this.bindBuffer = (object)=>{
            if(usedItms.has(object)) {
                return usedItms.get(object);
            } else {
                if(freeItms.length === 0) {
                    this.localBuffers.push(new Uint16Array(this.itmPerChunk*this.alignedEleByteLength/2));
                    this.gpuBuffers.push (
                        this._device.createBuffer( {
                        size: this.itmPerChunk*this.alignedEleByteLength,
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
                    } ));
                    for(let i=0; i<this.itmPerChunk; ++i) {
                        freeItms[freeItms.length] = {chunkId: this.gpuBuffers.length - 1, offset: i*this.alignedEleByteLength};
                    }
                }
                //
                let res = freeItms[0];
                freeItms.shift();
                //
                usedItms.set(object, res);
                //
                return res;
            }
        }

        this.unBindBuffer = (object)=> {
            if(usedItms && usedItms.has(object)) {
                let itm = usedItms.get(object);
                usedItms.delete(object);
                freeItms.push(itm);
            }
        }

        this.updateChunk = (chunkId)=>{
            this._device.queue.writeBuffer(this.gpuBuffers[chunkId], 0, this.localBuffers[chunkId].buffer, 0);
        }

        this.dispose = ()=>{
            for(let i=0, il = this.gpuBuffers.length; i<il; ++i)
            {
                this.localBuffers[i] = null;
                this.gpuBuffers[i].destroy();
            }
            this.elementByteLength = 0;
            this.alignedEleByteLength = 0;
            this.localBuffers = null;
            this.gpuBuffers = null;
            //
            freeItms = null;
            usedItms = null;
        }
    }
}

export {WebGPUChunkedUniformBuffer}
