const WebGPUTypes = {
    UNKNOW: -1,
    BOOL: 0,
    F32: 1,
    I32: 2,
    U32: 3,
    VEC2: 4,
    VEC3: 5,
    VEC4: 6,
    MAT2X2: 7,
    MAT3X2: 8,
    MAT4X2: 9,
    MAT2X3: 10,
    MAT3X3: 11,
    MAT4X3: 12,
    MAT2X4: 13,
    MAT3X4: 14,
    MAT4X4: 15,
    ARRAY: 16,
    STRUCT: 17
}
class WebGPUTypesLayout {
    constructor() {
        let typesLayout = new Map();
        typesLayout.set("f32", {alignment: 4, size: 4, type: WebGPUTypes.F32});
        typesLayout.set("i32", {alignment: 4, size: 4, type: WebGPUTypes.U32});
        typesLayout.set("u32", {alignment: 4, size: 4, type: WebGPUTypes.I32});
        typesLayout.set("vec2", {alignment: 8, size: 8, type: WebGPUTypes.VEC2, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("vec3", {alignment: 16, size: 12, type: WebGPUTypes.VEC3, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("vec4", {alignment: 16, size: 16, type: WebGPUTypes.VEC4, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat2x2", {alignment: 8, size: 16, type: WebGPUTypes.MAT2X2, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat3x2", {alignment: 8, size: 24, type: WebGPUTypes.MAT3X2, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat4x2", {alignment: 8, size: 32, type: WebGPUTypes.MAT4X2, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat2x3", {alignment: 16, size: 32, type: WebGPUTypes.MAT2X3, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat3x3", {alignment: 16, size: 48, type: WebGPUTypes.MAT3X3, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat4x3", {alignment: 16, size: 64, type: WebGPUTypes.MAT4X3, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat2x4", {alignment: 16, size: 32, type: WebGPUTypes.MAT2X4, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat3x4", {alignment: 16, size: 48, type: WebGPUTypes.MAT3X4, elementType: WebGPUTypes.UNKNOW});
        typesLayout.set("mat4x4", {alignment: 16, size: 64, type: WebGPUTypes.MAT4X4, elementType: WebGPUTypes.UNKNOW});
        //
        //roundUp(k, n) = ⌈n ÷ k⌉ × k
        function roundUp(k, n) {
            return Math.ceil(n/k)*k;
        }

        function  layoutOfArray(define, numItm) {
            const isRuntimeSized = define.indexOf(',') <0 && !numItm;
            let type ;
            if(isRuntimeSized || numItm) {
                type = define.substring(define.indexOf('<')+1, define.indexOf('>')).trim();
            } else  {
                type = define.substring(define.indexOf('<')+1, define.indexOf(',')).trim();
            }
            const eleType = type;
            if(type.indexOf('<') !== -1) {
                type = type.substr(0, type.indexOf('<'));
            }
            const itmCount = isRuntimeSized ? -1 : numItm === undefined?
                Number(define.substring(define.indexOf(',')+1, define.lastIndexOf('>')).trim()) :
                Number(numItm);

            //AlignOf(E)    N × roundUp(AlignOf(E), SizeOf(E))
            const itmLayout = typesLayout.get(type);
            const stride = itmLayout.size > 0 ? roundUp(itmLayout.alignment, itmLayout.size) : -1;
            return {
                isArray: true,
                isRuntimeSized: isRuntimeSized,
                alignment: typesLayout.get(type).alignment,
                stride: stride,
                size: isRuntimeSized ? -1 : itmCount*stride,
                type: WebGPUTypes.ARRAY,
                elementType: eleType,
                itmCount: itmCount
            };
        }


        this.addStructType = (struct_name, members)=> {
            if(typesLayout.has(struct_name)) {
                return 2;
            }
            let memberLayouts = [];
            let struct_alignment = 0;
            let struct_size = 0;
            for(let n=0, nMem = members.length; n<nMem; ++n)
            {
                const member = members[n].trim();
                const p = member.indexOf(':');
                if(p <= 0) {
                    continue;
                }
                let name = member.substr(0, p);
                name = name.replace(/@size(\d+)/g, function (match) {
                    //todo;
                    return 0;
                })
                name = name.replace(/@align(\d+)/g, function (match) {
                    //todo;
                    return 0;
                });
                name = name.trim();
                let type = member.substr(p+1, member.length-p).trim();
                let isArray = type.substr(0,5) === 'array';
                //
                let memberLayout;
                //OffsetOfMember(S, 1) = 0
                //OffsetOfMember(S, i) = roundUp(AlignOfMember(S, i ), OffsetOfMember(S, i-1) + SizeOfMember(S, i-1))
                if(isArray) {
                    const arrayLayout = layoutOfArray(type);
                    const alignment = arrayLayout.alignment;
                    const offset = n===0 ? 0 : roundUp(alignment, memberLayouts[n-1].offset + memberLayouts[n-1].size);
                    const size = arrayLayout.size;
                    //
                    memberLayout = {name:name, type: type, alignment: alignment, offset: offset, size: size};
                } else {
                    const memberLayout_ = this.getLayout(type);
                    const alignment = memberLayout_.alignment;
                    const offset = n===0 ? 0 : roundUp(alignment, memberLayouts[n-1].offset + memberLayouts[n-1].size);
                    const size = memberLayout_.size;
                    //
                    memberLayout = {name:name, type: type, alignment: alignment, offset: offset, size: size};
                }
                //
                struct_alignment = struct_alignment < memberLayout.alignment ? memberLayout.alignment : struct_alignment;
                //
                memberLayouts[memberLayouts.length] = memberLayout;
            }
            //
            //roundUp(AlignOf(S), justPastLastMember)
            //where justPastLastMember = OffsetOfMember(S,N) + SizeOfMember(S,N)
            const lastMemberLayout = memberLayouts[memberLayouts.length-1];
            struct_size = roundUp(struct_alignment, lastMemberLayout.offset + lastMemberLayout.size);
            typesLayout.set(struct_name, {isStruct: true, alignment: struct_alignment, size: struct_size, memberLayout: memberLayouts, type: WebGPUTypes.STRUCT});
            //
            return 1;
        }

        this.getLayout = (typeName)=> {
            if(!typesLayout.has(typeName)) {
                if(typeName.startsWith('array')) {
                    typesLayout.set(typeName, layoutOfArray(typeName));
                }
                let type_name = typeName;
                if(typeName.indexOf('<') > 0) {
                    type_name = typeName.substring(0, typeName.indexOf('<')).trim();
                }
                if(typesLayout.has(type_name)) {
                    const layout = typesLayout.get(type_name);
                    if(typeName.indexOf('f') > 3) {
                        layout.elementType = WebGPUTypes.F32;
                    } else if(typeName.indexOf('i') > 3) {
                        layout.elementType = WebGPUTypes.I32;
                    } else if(typeName.indexOf('u') > 3) {
                        layout.elementType = WebGPUTypes.U32;
                    }
                    typesLayout.set(typeName, layout);
                }
            }
            //
            return typesLayout.get(typeName);
        }

        this.hasLayout = (typeName)=> {
            if(typesLayout.has(typeName))
                return true;
            //
            if(typeName.indexOf('<') > 0) {
                typeName = typeName.substring(0, typeName.indexOf('<')).trim();
            }
            return typesLayout.has(typeName);
        }
    }
}

const builtInTypesLayout = new WebGPUTypesLayout();
export {WebGPUTypesLayout, WebGPUTypes, builtInTypesLayout};
