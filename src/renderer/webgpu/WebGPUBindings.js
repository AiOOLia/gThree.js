class WebGPUBindings {

	constructor( device, info, properties, textures, attributes, shaderSources ) {

		this.device = device;
		this.info = info;
		this.properties = properties;
		this.textures = textures;
		this.attributes = attributes;
		this.shaderSources = shaderSources;

		this.uniformsData = new WeakMap();

		this.updateMap = new WeakMap();

		this._gpuBufferCache = new Map();
	}

	get( object, bindingGroup, bindLayout, chunkedUniformBuffer) {
		let data = object ? this.uniformsData.get( object ) : undefined;
		if ( data === undefined && bindingGroup && bindingGroup.length > 0) {
			let useChunkedUniformBuffer = false;
			if(bindingGroup[0].isUniformsGroup) {
				if(chunkedUniformBuffer && object) {
					const bindInfo = chunkedUniformBuffer.bindBuffer(object);
					bindingGroup[0].setBuffer(chunkedUniformBuffer.localBuffers[bindInfo.chunkId], bindInfo.offset);
					bindingGroup[0].setGPUBuffer(chunkedUniformBuffer.gpuBuffers[bindInfo.chunkId], bindInfo.offset);
					useChunkedUniformBuffer = true;
				} else {
					bindingGroup[0].createGPUBuffer(this.device);
				}
			}
			//
			const bindGroup = this._createBindGroup( bindingGroup, bindLayout );

			data = {
				layout: bindLayout,
				group: bindGroup,
				bindings: bindingGroup
			};
			if(useChunkedUniformBuffer) {
				data.chunkedUniformBuffer = chunkedUniformBuffer;
			}

			if(object) {
				this.uniformsData.set( object, data );
			}
		} else if(bindingGroup && bindingGroup.length > 0){
			if(data.chunkedUniformBuffer !== chunkedUniformBuffer) {
				data.chunkedUniformBuffer = chunkedUniformBuffer;

				const bindInfo = chunkedUniformBuffer.bindBuffer(object);
				bindingGroup[0].setBuffer(chunkedUniformBuffer.localBuffers[bindInfo.chunkId], bindInfo.offset);
				bindingGroup[0].setGPUBuffer(chunkedUniformBuffer.gpuBuffers[bindInfo.chunkId], bindInfo.offset);

			}
		}

		return data;
	}

	remove( object ) {
		let uniformsData = object ? this.uniformsData.get( object ) : undefined;
		if(uniformsData) {
			if(uniformsData.chunkedUniformBuffer) {
				uniformsData.chunkedUniformBuffer.unBindBuffer(object);
			} else if(uniformsData.bindings[0].isUniformsGroup) {
				uniformsData.bindings[0].dispose();
			}
		}
		this.uniformsData.delete( object );
	}

	update( data, gpuTypesLayout, updateGPUImmediately ) {

		if(!data) return;
		//
		const textures = this.textures;

		const bindings = data.bindings;

		const updateMap = this.updateMap;
		const frame = this.info.render.frame;

		let needsBindGroupRefresh = false;

		// iterate over all bindings and check if buffer updates or a new binding group is required

		for ( const binding of bindings ) {

			const isShared = binding.isShared;
			const isUpdated = updateMap.get( binding ) === frame;

			if ( isShared && isUpdated ) continue;

			if ( binding.isUniformBuffer ) {

				if ( updateGPUImmediately) {
					binding.updateGPUBuffer(this.device);
				}

			} else if ( binding.isStorageBuffer ) {
				if(binding.type === "storage-buffer" && binding.buffer) {
					binding.updateGPUBuffer(this.device);
				} else if(binding.attribute) {
					const attribute = binding.attribute;
					this.attributes.update( attribute, false, binding.usage );
				}
			} else if ( binding.isSampler ) {

				const texture = binding.getTexture();

				textures.updateSampler( texture );

				const samplerGPU = textures.getSampler( texture );

				if ( binding.samplerGPU !== samplerGPU ) {

					binding.samplerGPU = samplerGPU;
					needsBindGroupRefresh = true;

				}

			} else if ( binding.isSampledTexture ) {

				const texture = binding.getTexture();

				const needsTextureRefresh = textures.updateTexture( texture );
				const textureGPU = textures.getTextureGPU( texture );

				if ( textureGPU !== undefined && binding.textureGPU !== textureGPU || needsTextureRefresh === true ) {

					binding.textureGPU = textureGPU;
					needsBindGroupRefresh = true;

				}

			}

			updateMap.set( binding, frame );

		}

		if ( needsBindGroupRefresh === true ) {

			data.group = this._createBindGroup( bindings, data.layout );

		}

	}

	dispose() {
		this.uniformsData = new WeakMap();
		this.updateMap = new WeakMap();
	}

	_createBindGroup( bindings, layout ) {
		const entries = [];
		for ( const binding of bindings ) {
			if ( binding.isUniformBuffer ) {
				const entries_ = binding.getEntries();
				//
				if(!binding.bufferGPU) {
					let gpuBufferCacheKey = '' + binding.usage;
					if(binding.isUniformsGroup) {
						for ( let i = 0, l = binding.uniforms.length; i < l; i ++ ) {
							const uniform = binding.uniforms[ i ];
							gpuBufferCacheKey += uniform.bindingPoint + '' + uniform.offset + '' + uniform.layout.size;
						}
					}
					//
					if(!this._gpuBufferCache.has(gpuBufferCacheKey)) {
						let bufferGPU = this.device.createBuffer( {
							size: binding.getByteLength(),
							usage: binding.usage,
						} );
						//
						binding.setGPUBuffer(bufferGPU);
						this._gpuBufferCache.set(gpuBufferCacheKey, bufferGPU);
					} else {
						binding.setGPUBuffer(this._gpuBufferCache.get(gpuBufferCacheKey));
					}
				}
				//
				entries.push(...entries_);
			} else if ( binding.isStorageBuffer ) {

				if ( binding.bufferGPU === null ) {
					if(binding.type === "storage-buffer") {
						binding.createGPUBuffer(this.device);
					} else if(binding.attribute) {
						const attribute = binding.attribute;

						this.attributes.update( attribute, false, binding.usage );
						binding.bufferGPU = this.attributes.get( attribute ).buffer;
					}
				}

				entries.push( { binding: binding.binding, resource: { buffer: binding.bufferGPU } } );
			} else if ( binding.isSampler ) {
				const texture = binding.getTexture();
				if(texture && !this.textures.getSampler( texture )) {
					this.textures.updateSampler(texture);
				}
				binding.samplerGPU = texture ? this.textures.getSampler( texture ) : null;
				if ( binding.samplerGPU === null ) {
					binding.samplerGPU = this.textures.getDefaultSampler();
				}

				entries.push( { binding: binding.bindingPoint, resource: binding.samplerGPU } );
			} else if ( binding.isSampledTexture ) {
				let texture = binding.getTexture();
				if(texture) {
					this.textures.updateTexture(texture);
				}
				binding.textureGPU = texture ? this.textures.getTextureGPU( texture ) : null;
				if ( binding.textureGPU === null ) {
					if ( binding.isSampledCubeTexture ) {
						texture = this.textures.defaultCubeTexture;
						binding.textureGPU = this.textures.getDefaultCubeTexture();
					} else {
						texture = this.textures.defaultTexture;
						binding.textureGPU = this.textures.getDefaultTexture();
					}
				}

				entries.push( { binding: binding.bindingPoint, resource: this.textures.getDefaultTextureView( texture ) } );
			}
		}

		return this.device.createBindGroup( {
			layout: layout,
			entries: entries
		} );

	}

}

export default WebGPUBindings;
