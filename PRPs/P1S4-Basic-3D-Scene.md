# PRP for Phase 1 Step 4: Basic 3D Scene Setup

## 1. Goal

The goal of this PRP is to implement a basic 3D scene using `@react-three/fiber`. This will serve as the foundation for the voxel diorama viewer. The scene will include basic lighting, a ground plane, and camera controls to verify that the 3D environment is functional.

## 2. Context

### Files to Modify
- `src/features/viewer/Viewer.tsx`: The component responsible for rendering the 3D scene.

### Documentation
- **@react-three/fiber Documentation:** [https://docs.pmnd.rs/react-three-fiber/getting-started/introduction](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- **@react-three/drei Documentation (for OrbitControls):** [https://github.com/pmndrs/drei#orbitcontrols](https://github.com/pmndrs/drei#orbitcontrols)

### Key Concepts
- `@react-three/fiber` provides a React renderer for Three.js, allowing us to build 3D scenes declaratively.
- The `<Canvas>` component is the main entry point for a `react-three-fiber` scene.
- Lighting is essential for seeing objects in the scene. We will use a combination of `<ambientLight>` and `<directionalLight>`.
- A "mesh" is a 3D object composed of a "geometry" (the shape) and a "material" (the appearance).
- `@react-three/drei` is a helper library for `react-three-fiber` that provides useful components, including `<OrbitControls>` for camera manipulation.

## 3. Implementation Blueprint

1.  **Import necessary components:**
    -   In `src/features/viewer/Viewer.tsx`, import `Canvas` from `@react-three/fiber`.
    -   Import `OrbitControls` from `@react-three/drei`.

2.  **Set up the Canvas:**
    -   The `Viewer` component should return a `<Canvas>` element. This will create the WebGL context and the Three.js scene.

3.  **Add Lighting:**
    -   Inside the `<Canvas>`, add an `<ambientLight>` to provide some general, non-directional light to the entire scene. An intensity of `0.5` is a good starting point.
    -   Add a `<directionalLight>` to simulate a light source like the sun. Set its position (e.g., `[10, 10, 5]`) and intensity (e.g., `1`).

4.  **Create a Ground Plane:**
    -   Add a `<mesh>` component to represent the ground.
    -   To make it flat, set its rotation to `[-Math.PI / 2, 0, 0]`.
    -   Inside the `<mesh>`, define its shape with `<planeGeometry>`. `args={[10, 10]}` will create a 10x10 plane.
    -   Define its appearance with `<meshStandardMaterial>`. A simple color like `"grey"` will suffice.

5.  **Add Camera Controls:**
    -   Finally, add the `<OrbitControls />` component inside the `<Canvas>`. This will automatically enable orbit (rotate), pan, and zoom controls with the mouse.

## 4. Validation Gates

The primary validation for this task is visual. The following command should start the development server, which can be used to visually inspect the result.

```bash
npm run dev
```

### Manual Verification Checklist:
- [ ] The application loads without errors.
- [ ] A grey plane is visible in the center of the screen.
- [ ] The scene is illuminated.
- [ ] The user can rotate the camera around the center by clicking and dragging the left mouse button.
- [ ] The user can pan the camera by clicking and dragging the right mouse button.
- [ ] The user can zoom in and out using the mouse wheel.

## 5. Confidence Score

**10/10:** This is a standard and well-documented setup for a `react-three-fiber` application. The implementation is straightforward.
