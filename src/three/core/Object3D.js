import {Object3D} from 'three'

Object3D.prototype.dispose = function() {

    this.dispatchEvent( { type: 'dispose' } );

}