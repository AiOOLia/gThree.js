class WebGPUBinding {

	constructor( name = '' , visibility = 0) {

		this.name = name;
		this.visibility = visibility;

		this.type = null; // read-only

		this.isShared = false;

	}

	setVisibility( visibility ) {

		this.visibility = visibility;

	}

}

export default WebGPUBinding;
