import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Core class for managing the 3D voxel world using Three.js.
 * It handles the scene, camera, renderer, lighting, and user controls.
 */
export class VoxelWorld {
  /** The Three.js scene object. */
  public scene: THREE.Scene;
  /** The active perspective camera. */
  public camera: THREE.PerspectiveCamera;
  /** The WebGL renderer. */
  public renderer: THREE.WebGLRenderer;
  /** Orbit controls for camera manipulation. */
  private controls: OrbitControls;
  /** Flag to track if a render frame has been requested. */
  private renderRequested: boolean = false;

  /**
   * Initializes the VoxelWorld instance.
   *
   * @param container - The HTMLDivElement where the renderer's canvas will be appended.
   */
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

  /**
   * Adds a chunk mesh to the scene.
   *
   * @param chunkId - A unique identifier for the chunk (currently unused logic-wise but good for tracking).
   * @param mesh - The Three.js Mesh object representing the chunk.
   */
  public addChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.add(mesh);
    this.requestRender();
  }

  /**
   * Removes a chunk mesh from the scene.
   *
   * @param chunkId - The unique identifier of the chunk to remove.
   * @param mesh - The Three.js Mesh object to remove.
   */
  public removeChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    this.requestRender();
  }

  /**
   * Cleans up resources and event listeners when the world is destroyed.
   */
  public dispose() {
    window.removeEventListener('resize', () => this.handleResize());
    this.renderer.dispose();
    this.controls.dispose();
  }

  /**
   * The main animation loop.
   * Keeps the loop running via requestAnimationFrame but only renders when requested.
   */
  private animate() {
    requestAnimationFrame(() => this.animate());

    this.controls.update();

    if (this.renderRequested) {
      this.renderer.render(this.scene, this.camera);
      this.renderRequested = false;
    }
  }

  /**
   * Flags that a new render frame is needed.
   * Call this whenever the scene changes (e.g., mesh added, camera moved).
   */
  public requestRender() {
    this.renderRequested = true;
  }

  /**
   * Handles window resize events to update camera aspect ratio and renderer size.
   */
  private handleResize() {
    if (this.renderer.domElement.parentElement) {
      const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
      this.camera.aspect = clientWidth / clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
      this.requestRender();
    }
  }

  /**
   * Sets the auto-rotate state of the camera controls.
   * @param enabled - Whether to enable auto-rotation.
   */
  public setAutoRotate(enabled: boolean) {
    this.controls.autoRotate = enabled;
    // If enabled, we need to ensure the animation loop keeps rendering
    // But since controls.update() fires 'change' event which calls requestRender(), it should work.
    // However, we might need to manually trigger a render to start it if it was idle.
    this.requestRender();
  }
}
