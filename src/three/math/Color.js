import {Color} from 'three'
Object.defineProperties(Color.prototype, {
    'x':{
        get:function () {
            return this.r;
        },
        set:function (value) {
            this.r = value;
        }
    },
    'y':{
        get:function () {
            return this.g;
        },
        set:function (value) {
            this.g = value;
        }
    },
    'z':{
        get:function () {
            return this.b;
        },
        set:function (value) {
            this.b = value;
        }
    }
});