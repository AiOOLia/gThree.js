import { Color, Matrix3, Matrix4, Vector2, Vector3, Vector4 } from "three";
import {builtInTypesLayout, WebGPUTypes} from "./WebGPUTypesLayout";


let setNumber = (v, offset, dst)=> {
	dst[offset] = v;
};

let setVector2 = (v, offset, dst)=> {
	const src = v.isVector2 ? [v.x, v.y] : v;
	dst.set(src, offset);
};

let setVector3 = (v, offset, dst)=>{
	const src = (v.isVector3 || v.isColor) ? [v.x, v.y, v.z] : v;
	dst.set(src, offset);
};

let setColor = (v, offset, dst)=>{
	const src = (v.isVector3 || v.isColor) ? [v.x, v.y, v.z] : v;
	dst.set(src, offset);
};

let setVector4 =(v, offset, dst)=>{
	const src = v.isVector4 ? [v.x, v.y, v.z, v.w] : v;
	dst.set(src, offset);
};

let setMatrix3 = (v, offset, dst)=>{
	const src = v.elements ? v.elements : v;

	dst[ offset + 0 ] =  src[ 0 ];
	dst[ offset + 1 ] =  src[ 1 ];
	dst[ offset + 2 ] =  src[ 2 ];
	dst[ offset + 4 ] =  src[ 3 ];
	dst[ offset + 5 ] =  src[ 4 ];
	dst[ offset + 6 ] =  src[ 5 ];
	dst[ offset + 8 ] =  src[ 6 ];
	dst[ offset + 9 ] =  src[ 7 ];
	dst[ offset + 10 ] = src[ 8 ];
};

let setMatrix4 = (v, offset, dst)=>{
	dst.set(v.elements ? v.elements : v, offset);
};

let setByValue = ( valueType, gpuTypesLayout, value, offset, bindingBuffer)=> {
	const valueTypeLayout = gpuTypesLayout.getLayout(valueType);
	//
	if(value === undefined || value === null) return;
	//
	if(valueTypeLayout.isArray) {
		if(valueTypeLayout.itmCount > 0 && valueTypeLayout.elementType === 'mat4x4<f32>') {
			if(value[0].isMatrix4) {
				for(let i=0; i<valueTypeLayout.itmCount; ++i) {
					setByValue(valueTypeLayout.elementType, gpuTypesLayout, value[i], offset + i*valueTypeLayout.stride, bindingBuffer);
				}
			} else {
				const value_ = new Matrix4();
				for(let i=0; i<valueTypeLayout.itmCount; ++i) {
					for(let n=0; n<16; ++n) {
						value_.elements[n] = value[i*16 + n];
					}
					setByValue(valueTypeLayout.elementType, gpuTypesLayout, value_, offset + i*valueTypeLayout.stride, bindingBuffer);
				}
			}
		} else {
			for(let i=0; i<valueTypeLayout.itmCount; ++i) {
				setByValue(valueTypeLayout.elementType, gpuTypesLayout, value[i], offset + i*valueTypeLayout.stride, bindingBuffer);
			}
		}
		return;
	}
	//
	if(valueTypeLayout.isStruct) {
		const memberLayouts = valueTypeLayout.memberLayout;
		for(let i=0, numMember = memberLayouts.length; i<numMember; ++i) {
			setByValue(memberLayouts[i].type, gpuTypesLayout, value[memberLayouts[i].name], offset + memberLayouts[i].offset, bindingBuffer);
		}
	}
	else if(valueTypeLayout.type === WebGPUTypes.F32) {
		setNumber(value, offset/4, bindingBuffer.bufferF32);
	}
	else if(valueTypeLayout.type === WebGPUTypes.I32) {
		setNumber(value, offset/4, bindingBuffer.bufferI32);
	}
	else if(valueTypeLayout.type === WebGPUTypes.U32) {
		setNumber(value, offset/4, bindingBuffer.bufferU32);
	}
	else if(valueTypeLayout.type === WebGPUTypes.VEC2) {
		if(valueTypeLayout.elementType === WebGPUTypes.F32) {
			setVector2(value, offset/4, bindingBuffer.bufferF32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.I32) {
			setVector2(value, offset/4, bindingBuffer.bufferI32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.U32) {
			setVector2(value, offset/4, bindingBuffer.bufferU32);
		}
	}
	else if(valueTypeLayout.type === WebGPUTypes.VEC3) {
		if(valueTypeLayout.elementType === WebGPUTypes.F32) {
			setVector3(value, offset/4, bindingBuffer.bufferF32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.I32) {
			setVector3(value, offset/4, bindingBuffer.bufferI32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.U32) {
			setVector3(value, offset/4, bindingBuffer.bufferU32);
		}
	}
	else if(valueTypeLayout.type === WebGPUTypes.VEC4) {
		if(valueTypeLayout.elementType === WebGPUTypes.F32) {
			setVector4(value, offset/4, bindingBuffer.bufferF32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.I32) {
			setVector4(value, offset/4, bindingBuffer.bufferI32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.U32) {
			setVector4(value, offset/4, bindingBuffer.bufferU32);
		}
	}
	else if(valueTypeLayout.type === WebGPUTypes.MAT3X3) {
		if(valueTypeLayout.elementType === WebGPUTypes.F32) {
			setMatrix3(value, offset/4, bindingBuffer.bufferF32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.I32) {
			setMatrix3(value, offset/4, bindingBuffer.bufferI32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.U32) {
			setMatrix3(value, offset/4, bindingBuffer.bufferU32);
		}
	}
	else if(valueTypeLayout.type === WebGPUTypes.MAT4X4) {
		if(valueTypeLayout.elementType === WebGPUTypes.F32) {
			setMatrix4(value, offset/4, bindingBuffer.bufferF32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.I32) {
			setMatrix4(value, offset/4, bindingBuffer.bufferI32);
		} else if(valueTypeLayout.elementType === WebGPUTypes.U32) {
			setMatrix4(value, offset/4, bindingBuffer.bufferU32);
		}
	}
}

class WebGPUUniform {

	constructor( name, layout, value = null, bindingPoint = 0, group = 0 ) {

		this.name = name;
		this.layout = layout;
		this._value = value;

		this.offset = 0; // this property is set by WebGPUUniformsGroup and marks the start position in the uniform buffer
		this.bindingPoint = bindingPoint;
		this.group = group;
		this.needsUpdate = true;

		this._bindingBuffer = null;
	}

	setValue( value ) {
		this._value = value;
	}

	getValue() {
		return this._value;
	}

	set(value) {
		this.value = value;
	}

	initBuffer(buffer) {
		if(this._value) {
			WebGPUUniform.currentBindingBuffer = buffer;
			this.value = this._value;
		}
	}

}

class FloatUniform extends WebGPUUniform {
	constructor( name, value = 0, bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('f32'), value, bindingPoint, group );

		this.isFloatUniform = true;
		this.valueType = 'f32';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4] = value;
		}
	}

	negate() {
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4]*=-1;
		}
	}
}

class IntUniform extends WebGPUUniform {
	constructor(name, value = 0, bindingPoint = 0, group = 0) {
		super(name, builtInTypesLayout.getLayout('i32'), value, bindingPoint, group);
		this.isIntUniform = true;
		this.valueType = 'i32';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4] = value;
		}
	}

	negate() {
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4]*=-1;
		}
	}
}

class UintUniform extends WebGPUUniform {
	constructor(name, value = 0, bindingPoint = 0, group = 0) {
		super(name, builtInTypesLayout.getLayout('u32'), value, bindingPoint, group);
		this.isUintUniform = true;
		this.valueType = 'u32';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4] = value;
		}
	}

	negate() {
		if(this._bindingBuffer) {
			this._bindingBuffer.bufferF32[this.offset/4]*=-1;
		}
	}
}


class Vector2fUniform extends WebGPUUniform {
	constructor( name,  value = new Vector2(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec2'), value, bindingPoint, group );
		this.isVector2fUniform = true;
		this.valueType = 'vec2<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector2 ? [value.x, value.y] : value;
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}

	set(x,y) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
		}
	}
}

class Vector2iUniform extends WebGPUUniform {
	constructor( name,  value = new Vector2(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec2'), value, bindingPoint, group );
		this.isVector2iUniform = true;
		this.valueType = 'vec2<i32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector2 ? [value.x, value.y] : value;
			this._bindingBuffer.bufferI32.set(v, offset);
		}
	}

	set(x,y) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
		}
	}
}


class Vector2uUniform extends WebGPUUniform {
	constructor( name,  value = new Vector2(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec2'), value, bindingPoint, group );
		this.isVector2uUniform = true;
		this.valueType = 'vec<u32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector2 ? [value.x, value.y] : value;
			this._bindingBuffer.bufferU32.set(v, offset);
		}
	}

	set(x,y) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
		}
	}
}

class Vector3fUniform extends WebGPUUniform {
	constructor( name, value = new Vector3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec3'), value, bindingPoint, group );
		this.isVector3fUniform = true;
		this.valueType = 'vec3<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = (value.isVector3 || value.isColor) ? [value.x, value.y, value.z] : value;
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}

	set(x,y, z) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z];
			}
		}
	}

	setFromMatrixPosition(matrix) {
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = [matrix.elements[12], matrix.elements[13], matrix.elements[14]];
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
		}
	}
}

class Vector3iUniform extends WebGPUUniform {
	constructor( name, value = new Vector3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec3'), value, bindingPoint, group );
		this.isVector3iUniform = true;
		this.valueType = 'vec3<i32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector3 ? [value.x, value.y, value.z] : value;
			this._bindingBuffer.bufferI32.set(v, offset);
		}
	}

	set(x,y, z) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
		}
	}
}


class Vector3uUniform extends WebGPUUniform {
	constructor( name, value = new Vector3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec3'), value, bindingPoint, group );
		this.isVector3uUniform = true;
		this.valueType = 'vec3<u32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector3 ? [value.x, value.y, value.z] : value;
			this._bindingBuffer.bufferU32.set(v, offset);
		}
	}

	set(x,y, z) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
		}
	}
}

class Vector4fUniform extends WebGPUUniform {
	constructor( name, value = new Vector4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec4'), value, bindingPoint, group );
		this.isVector4fUniform = true;
		this.valueType = 'vec4<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector4 ? [value.x, value.y, value.z, value.w] : value;
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}

	set(x,y, z, w) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z, w];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
			this._bindingBuffer.bufferF32[offset + 3]*=-1;
		}
	}
}


class Vector4iUniform extends WebGPUUniform {
	constructor( name, value = new Vector4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec4'), value, bindingPoint, group );
		this.isVector4iUniform = true;
		this.valueType = 'vec4<i32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector4 ? [value.x, value.y, value.z, value.w] : value;
			this._bindingBuffer.bufferI32.set(v, offset);
		}
	}

	set(x,y, z, w) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z, w];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
			this._bindingBuffer.bufferF32[offset + 3]*=-1;
		}
	}
}


class Vector4uUniform extends WebGPUUniform {
	constructor( name, value = new Vector4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec4'), value, bindingPoint, group );
		this.isVector4uUniform = true;
		this.valueType = 'vec4<u32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isVector4 ? [value.x, value.y, value.z, value.w] : value;
			this._bindingBuffer.bufferU32.set(v, offset);
		}
	}

	set(x,y, z, w) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z, w];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
			this._bindingBuffer.bufferF32[offset + 3]*=-1;
		}
	}
}

class ColorUniform extends WebGPUUniform {
	constructor( name, value = new Color(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('vec3'), value, bindingPoint, group );
		this.isColorUniform = true;
		this.valueType = 'vec3<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = (value.isVector3 || value.isColor) ? [value.x, value.y, value.z] : value;
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}

	set(x,y, z) {
		if(this._bindingBuffer) {
			if(y===undefined) {
				this.value = x;
			} else {
				this.value = [x,y, z];
			}
		}
	}

	negate() {
		if(this._bindingBuffer) {
			const offset = this.offset / 4;
			this._bindingBuffer.bufferF32[offset]*=-1;
			this._bindingBuffer.bufferF32[offset + 1]*=-1;
			this._bindingBuffer.bufferF32[offset + 2]*=-1;
		}
	}
}


class Matrix3fUniform extends WebGPUUniform {
	constructor( name, value = new Matrix3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat3x3'), value, bindingPoint, group );
		this.isMatrix3fUniform = true;
		this.valueType = 'mat3x3<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			setMatrix3(value, this.offset/4, this._bindingBuffer.bufferF32);
		}
	}
}


class Matrix3iUniform extends WebGPUUniform {
	constructor( name, value = new Matrix3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat3x3'), value, bindingPoint, group );
		this.isMatrix3iUniform = true;
		this.valueType = 'mat3x3<i32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			setMatrix3(value, this.offset/4, this._bindingBuffer.bufferI32);
		}
	}
}

class Matrix3uUniform extends WebGPUUniform {
	constructor( name, value = new Matrix3(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat3x3'), value, bindingPoint, group );
		this.isMatrix3uUniform = true;
		this.valueType = 'mat3x3<u32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			setMatrix3(value, this.offset/4, this._bindingBuffer.bufferU32);
		}
	}
}

class Matrix4fUniform extends WebGPUUniform {
	constructor( name, value = new Matrix4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat4x4'), value, bindingPoint, group );
		this.isMatrix4fUniform = true;
		this.valueType = 'mat4x4<f32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isMatrix4 ? value.elements : value;
			this._bindingBuffer.bufferF32.set(v, offset);
		}
	}
}

class Matrix4iUniform extends WebGPUUniform {
	constructor( name, value = new Matrix4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat4x4'), value, bindingPoint, group );
		this.isMatrix4iUniform = true;
		this.valueType = 'mat4x4<i32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isMatrix4 ? value.elements : value;
			this._bindingBuffer.bufferI32.set(v, offset);
		}
	}
}

class Matrix4uUniform extends WebGPUUniform {
	constructor( name, value = new Matrix4(), bindingPoint = 0, group = 0 ) {
		super( name, builtInTypesLayout.getLayout('mat4x4'), value, bindingPoint, group );
		this.isMatrix4uUniform = true;
		this.valueType = 'mat4x4<u32>';
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			const offset = this.offset/4;
			const v = value.isMatrix4 ? value.elements : value;
			this._bindingBuffer.bufferU32.set(v, offset);
		}
	}
}

class StructUniform extends WebGPUUniform {
	constructor(name, typeName, layout, value, bindingPoint = 0, group = 0) {
		super(name, layout, value, bindingPoint, group);
		this.isStructniform = true;
		this.valueType = typeName;
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			setByValue(this.valueType, this._bindingBuffer.gpuTypesLayout, value, this.offset, this._bindingBuffer);
		}
	}
}


class ArrayUniform extends WebGPUUniform {
	constructor(name, typeName, layout, value,  bindingPoint = 0, group = 0) {
		super(name, layout, value, bindingPoint, group);
		this.isArrayUniform = true;
		this.valueType = typeName;
	}

	set value(value) {
		this._value = value;
		this._bindingBuffer = WebGPUUniform.currentBindingBuffer;
		if(this._bindingBuffer) {
			setByValue(this.valueType, this._bindingBuffer.gpuTypesLayout, value, this.offset, this._bindingBuffer);
		}
	}
}

WebGPUUniform.createUniform = (name, type, value, binding)=> {
	if(type.isStruct) {
		return new StructUniform(name, type.typeName, type.layout, value, binding);
	}
	else if(type.isArray) {
		return new ArrayUniform(name, type.typeName, type.layout, value, binding);
	}
	else if(type === 'f32') {
		return new FloatUniform(name, value, binding);
	} else if(type === 'i32') {
		return new IntUniform(name, value, binding);
	} else if(type === 'u32') {
		return new UintUniform(name, value, binding);
	} else if(type.startsWith('vec2')) {
		if(type.indexOf('f32') > 0) {
			return new Vector2fUniform(
				name,
				!value ? undefined : (value.isVector2? value:  new Vector2(value)),
				binding
			);
		} else if(type.indexOf('i32') > 0) {
			return new Vector2iUniform(
				name,
				!value ? undefined : (value.isVector2? value:  new Vector2(value)),
				binding
			);
		} else if(type.indexOf('u32') > 0) {
			return new Vector2uUniform(
				name,
				!value ? undefined : (value.isVector2? value:  new Vector2(value)),
				binding
			);
		}
	} else if(type.startsWith('vec3')) {
		if(type.indexOf('f32') > 0) {
			return new Vector3fUniform(
				name,
				!value ? undefined : (value.isVector3? value:  new Vector3(value)),
				binding
			);
		} else if(type.indexOf('i32') > 0) {
			return new Vector3iUniform(
				name,
				!value ? undefined : (value.isVector3? value:  new Vector3(value)),
				binding
			);
		} else if(type.indexOf('u32') > 0) {
			return new Vector3uUniform(
				name,
				!value ? undefined : (value.isVector3? value:  new Vector3(value)),
				binding
			);
		}
	} else if(type.startsWith('vec4')) {
		if(type.indexOf('f32') > 0) {
			return new Vector4fUniform(
				name,
				!value ? undefined : (value.isVector4? value:  new Vector4(value)),
				binding
			);
		} else if(type.indexOf('i32') > 0) {
			return new Vector4iUniform(
				name,
				!value ? undefined : (value.isVector4? value:  new Vector4(value)),
				binding
			);
		} else if(type.indexOf('u32') > 0) {
			return new Vector4uUniform(
				name,
				!value ? undefined : (value.isVector4? value:  new Vector4(value)),
				binding
			);
		}
	} else if(type.startsWith('mat3x3')) {
		if(type.indexOf('f32') > 0) {
			return new Matrix3fUniform(
				name,
				!value ? undefined : (value.isMatrix3? value : new Matrix3(value)),
				binding
			);
		} else if(type.indexOf('i32') > 0) {
			return new Matrix3iUniform(
				name,
				!value ? undefined : (value.isMatrix3? value : new Matrix3(value)),
				binding
			);
		} else if(type.indexOf('u32') > 0) {
			return new Matrix3uUniform(
				name,
				!value ? undefined : (value.isMatrix3? value : new Matrix3(value)),
				binding
			);
		}
	} else if(type.startsWith('mat4x4')) {
		if(type.indexOf('f32') > 0) {
			return new Matrix4fUniform(
				name,
				!value ? undefined : (value.isMatrix4? value : new Matrix4(value)),
				binding
			);
		} else if(type.indexOf('i32') > 0) {
			return new Matrix4iUniform(
				name,
				!value ? undefined : (value.isMatrix4? value : new Matrix4(value)),
				binding
			);
		} else if(type.indexOf('u32') > 0) {
			return new Matrix4uUniform(
				name,
				!value ? undefined : (value.isMatrix4? value : new Matrix4(value)),
				binding
			);
		}
	}
}

export { WebGPUUniform, FloatUniform, IntUniform, UintUniform, ColorUniform,
	Vector2fUniform, Vector3fUniform, Vector4fUniform,
	Vector2iUniform, Vector3iUniform, Vector4iUniform,
	Vector2uUniform, Vector3uUniform, Vector4uUniform,
	Matrix3fUniform, Matrix4fUniform,
	Matrix3iUniform, Matrix4iUniform,
	Matrix3uUniform, Matrix4uUniform,
	StructUniform, ArrayUniform };
