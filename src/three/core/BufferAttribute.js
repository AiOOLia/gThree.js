import {BufferAttribute} from 'three'
Object.defineProperties(BufferAttribute.prototype, {
    'bytesPerElement': {
        get:function () {
            return this.array.BYTES_PER_ELEMENT;
        }
    }
});
