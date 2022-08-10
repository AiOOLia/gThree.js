export default /* wgsl */`
@stage(vertex)
void main() {
	wgl_position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
