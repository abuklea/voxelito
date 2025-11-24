import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Core class for managing the 3D voxel world using Three.js.
 * It handles the scene, camera, renderer, lighting, and user controls.
 */
export class VoxelWorld {
  /** The Three.js scene object. */
  public scene: THREE.Scene;
  /** The active camera (Orthographic for Voxelito style). */
  public camera: THREE.OrthographicCamera;
  /** The WebGL renderer. */
  public renderer: THREE.WebGLRenderer;
  /** Orbit controls for camera manipulation. */
  public controls: OrbitControls;
  /** Post-processing composer. */
  private composer: EffectComposer;
  /** Grid helper for ground reference. */
  private gridHelper: THREE.GridHelper;
  /** Ground plane mesh. */
  private groundMesh: THREE.Mesh;
  /** Flag to track if a render frame has been requested. */
  private renderRequested: boolean = false;

  /**
   * Initializes the VoxelWorld instance.
   *
   * @param container - The HTMLDivElement where the renderer's canvas will be appended.
   */
  constructor(container: HTMLDivElement) {
    console.log("VoxelWorld initialized with Advanced Rendering (Orthographic + Bloom + Shadows)");

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f16); // Dark background match
    this.scene.fog = new THREE.Fog(0x0f0f16, 50, 400);

    // 2. Camera (Orthographic)
    const aspect = container.clientWidth / container.clientHeight;
    const d = 150; // Initial View size (increased for default 250 scale)
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.camera.position.set(150, 150, 150);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // 4. Post-Processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4, // Strength
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(bloomPass);

    // 5. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minZoom = 0.2; // Allow zooming out more for large scenes
    this.controls.maxZoom = 4;
    this.controls.addEventListener('change', () => this.requestRender());

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 500; // Increased

    const shadowSize = 250; // Increased coverage
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x7c3aed, 2, 200);
    purpleLight.position.set(-20, 20, -20);
    this.scene.add(purpleLight);

    // 7. Grid/Ground
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    this.groundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.1;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.gridHelper = new THREE.GridHelper(250, 250, 0x7c3aed, 0x2d2d3b);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    // Handle Resize
    window.addEventListener('resize', () => this.handleResize());

    this.animate();
    this.requestRender();
  }

  /**
   * Updates the scene size visualization (Grid and Ground).
   * @param w Width (X)
   * @param h Height (Y)
   * @param d Depth (Z)
   */
  public setSceneSize(w: number, h: number, d: number) {
      // Update Grid
      // GridHelper is square, take the max dimension
      const size = Math.max(w, d);
      // Create new grid helper
      this.scene.remove(this.gridHelper);
      // divisions = size ensures 1 unit spacing (if size is integer)
      this.gridHelper = new THREE.GridHelper(size, size, 0x7c3aed, 0x2d2d3b);
      this.gridHelper.position.y = 0;
      this.scene.add(this.gridHelper);

      // Update Ground
      // Make ground slightly larger than grid
      const groundSize = size * 2;
      this.groundMesh.geometry.dispose();
      this.groundMesh.geometry = new THREE.PlaneGeometry(groundSize, groundSize);

      this.requestRender();
  }

  public addChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.add(mesh);
    this.requestRender();
  }

  public removeChunkMesh(chunkId: string, mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
        } else {
            mesh.material.dispose();
        }
    }
    this.requestRender();
  }

  public dispose() {
    window.removeEventListener('resize', () => this.handleResize());
    this.renderer.dispose();
    this.controls.dispose();
    this.composer.dispose();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    if (this.renderRequested) {
      this.composer.render();
      this.renderRequested = false;
    }
  }

  public requestRender() {
    this.renderRequested = true;
  }

  private handleResize() {
    if (this.renderer.domElement.parentElement) {
      const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
      const aspect = clientWidth / clientHeight;
      const d = 80;

      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;

      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
      this.composer.setSize(clientWidth, clientHeight);
      this.requestRender();
    }
  }

  public setAutoRotate(enabled: boolean) {
    this.controls.autoRotate = enabled;
    this.requestRender();
  }

  public setGridVisibility(visible: boolean) {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
      this.requestRender();
    }
  }
}
