import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class VoxelWorld {
  public scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private renderRequested: boolean = false;

  constructor(container: HTMLDivElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => this.requestRender());

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Ground Plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 'grey' });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    this.scene.add(groundPlane);

    // Handle Resize
    window.addEventListener('resize', () => this.handleResize());

    this.animate();
    this.requestRender();
  }

  public addChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.add(mesh);
    this.requestRender();
  }

  public removeChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    this.requestRender();
  }

  public dispose() {
    window.removeEventListener('resize', () => this.handleResize());
    this.renderer.dispose();
    this.controls.dispose();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    this.controls.update();

    if (this.renderRequested) {
      this.renderer.render(this.scene, this.camera);
      this.renderRequested = false;
    }
  }

  private requestRender() {
    this.renderRequested = true;
  }

  private handleResize() {
    if (this.renderer.domElement.parentElement) {
      const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
      this.camera.aspect = clientWidth / clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
      this.requestRender();
    }
  }
}
