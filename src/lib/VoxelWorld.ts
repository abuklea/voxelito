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
    this.scene.background = new THREE.Color(0x0f0f16); // Dark background match
    this.scene.fog = new THREE.Fog(0x0f0f16, 10, 50); // Add fog for depth

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 15);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below floor
    this.controls.addEventListener('change', () => this.requestRender());

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    // Accent Light (Purple)
    const pointLight = new THREE.PointLight(0x7c3aed, 0.8, 50);
    pointLight.position.set(-10, 10, -10);
    this.scene.add(pointLight);

    // Ground / Grid
    // Create a large infinite-looking grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x7c3aed, 0x2d2d3b);
    gridHelper.position.y = -0.01; // Slightly below zero to avoid Z-fighting if we add meshes at 0
    this.scene.add(gridHelper);

    // Optional: Add a faint plane for reflections or just to catch shadows later
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x0f0f16,
        side: THREE.DoubleSide
    });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.1;
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
