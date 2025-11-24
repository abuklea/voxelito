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
    // Fog helps with depth, but in Ortho it looks different. Keep it for now but subtle.
    this.scene.fog = new THREE.Fog(0x0f0f16, 50, 400);

    // 2. Camera (Orthographic)
    const aspect = container.clientWidth / container.clientHeight;
    const d = 80; // View size
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    // Isometric position
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for performance
    this.renderer.shadowMap.enabled = true; // Enable Shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
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
      0.85 // Threshold (only very bright things glow)
    );
    this.composer.addPass(bloomPass);

    // 5. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true; // Better for Ortho
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 4;
    this.controls.addEventListener('change', () => this.requestRender());

    // 6. Lighting (Physically Correct / High Intensity)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    // Important for Ortho shadows to cover the area
    const shadowSize = 100;
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Accent Lights
    const purpleLight = new THREE.PointLight(0x7c3aed, 2, 100);
    purpleLight.position.set(-20, 20, -20);
    this.scene.add(purpleLight);

    // 7. Grid/Ground
    // Need a ground plane to catch shadows
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(planeGeometry, planeMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.gridHelper = new THREE.GridHelper(200, 200, 0x7c3aed, 0x2d2d3b);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

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
    if (mesh.geometry) {
        mesh.geometry.dispose();
    }
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
        } else {
            mesh.material.dispose();
        }
    }
    this.requestRender();
  }

  /**
   * Cleans up resources and event listeners when the world is destroyed.
   */
  public dispose() {
    window.removeEventListener('resize', () => this.handleResize());
    this.renderer.dispose();
    this.controls.dispose();
    this.composer.dispose();
  }

  /**
   * The main animation loop.
   * Keeps the loop running via requestAnimationFrame but only renders when requested.
   */
  private animate() {
    requestAnimationFrame(() => this.animate());

    this.controls.update();

    if (this.renderRequested) {
      // Use composer instead of renderer
      this.composer.render();
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

  /**
   * Sets the auto-rotate state of the camera controls.
   * @param enabled - Whether to enable auto-rotation.
   */
  public setAutoRotate(enabled: boolean) {
    this.controls.autoRotate = enabled;
    this.requestRender();
  }

  /**
   * Sets the visibility of the grid helper.
   * @param visible - Whether the grid should be visible.
   */
  public setGridVisibility(visible: boolean) {
    if (this.gridHelper) {
      this.gridHelper.visible = visible;
      this.requestRender();
    }
  }
}
