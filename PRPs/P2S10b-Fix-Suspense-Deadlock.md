name: "P2S10b - Fix Rendering Silence via Suspense Deadlock Resolution"
description: |
  This PRP addresses a critical, silent rendering failure in the Vite + React + three.js application. The application currently fails to render the `<canvas>` element for the 3D viewer, resulting in a blank screen with no console errors. The root cause has been identified as a **Suspense Deadlock**.

## Goal
The primary goal is to fix the silent rendering failure and get the basic `three.js` scene to render correctly. This will be achieved by resolving the underlying Suspense Deadlock.

## Why
- **Unblocks Development**: The current state is a complete blocker for all frontend and 3D-related development.
- **Restores Core Functionality**: The application's primary purpose is to display a 3D scene, which is currently non-functional.
- **Improves Application Stability**: By correctly handling suspense, the application will be more robust and less prone to silent, hard-to-debug failures.

## What
The fix involves wrapping the component that is triggering React Suspense (`SceneManager`) within a `<Suspense>` boundary in the main `App` component.

### Success Criteria
- [x] The application no longer hangs on a blank white screen.
- [x] The `three.js` `<canvas>` element is successfully created and appended to the DOM.
- [x] A basic 3D scene (e.g., a ground plane and a cube) is visible and interactive.
- [x] The browser console remains free of errors related to rendering or component lifecycle.

## All Needed Context

### Documentation & References
```yaml
- doc: https://react.dev/reference/react/Suspense
  why: Official React documentation explaining how Suspense and lazy loading work. This is the core concept behind the fix.
- file: src/App.tsx
  why: This is the file that needs to be modified to implement the fix.
- file: src/features/viewer/Viewer.tsx
  why: This component is currently not rendering, and the fix will allow it to render correctly.
- file: src/features/voxel-engine/SceneManager.tsx
  why: This component is the likely cause of the suspended rendering.
```

### Known Gotchas of our codebase & Library Quirks
- The `SceneManager` or one of its hooks (`useVoxelMesher`) is throwing a promise, which triggers React Suspense.
- Without a `<Suspense>` boundary, the entire `App` component suspends, preventing any DOM from being committed. This is why the `Viewer`'s `div` and the `three.js` canvas are never created.

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed

```yaml
Task 1:
MODIFY src/App.tsx:
  - Import the `Suspense` component from React.
  - Wrap the `SceneManager` component in a `<Suspense>` component.
  - Provide a `fallback` prop to the `<Suspense>` component to display a loading indicator.
  - Ensure the `Viewer` component remains *outside* the `<Suspense>` boundary so it can render immediately.
  - Add a conditional check to only render `SceneManager` when `voxelWorld` is not null.

```

### Per task pseudocode as needed added to each task
```tsx
// Task 1: Modify src/App.tsx

import React, { useRef, Suspense } from 'react'; // 1. Import Suspense
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { SceneData, Voxel } from "./features/voxel-engine/types";
import { useVoxelWorld } from './hooks/useVoxelWorld';

// ... (keep existing voxels and testScene definitions)

function App() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const voxelWorld = useVoxelWorld(viewerRef);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {/* 2. Viewer is outside Suspense, so it renders immediately */}
      <Viewer ref={viewerRef} />

      {/* 3. SceneManager is wrapped, so it can wait without blocking the App */}
      <Suspense fallback={<div>Loading Voxel Engine...</div>}>
        {/* 4. Conditionally render SceneManager only when voxelWorld is ready */}
        {voxelWorld && (
          <SceneManager sceneData={testScene} voxelWorld={voxelWorld} />
        )}
      </Suspense>
    </div>
  );
}

export default App;

```

## Validation Loop

### Level 1: Manual Verification
1.  Run `npm install` to ensure all dependencies are correct.
2.  Run `npm run dev` to start the Vite dev server.
3.  Open the application in a web browser.
4.  **Expected Result:** You should see the text "Loading Voxel Engine..." briefly, followed by the 3D scene with a grey ground plane and a single green cube.
5.  **Verification:** Use the browser's developer tools to inspect the DOM. Confirm that a `<canvas>` element has been created inside the `div` managed by the `Viewer` component.

### Level 2: Playwright Verification (Optional but Recommended)
- A Playwright script can be created to automate the verification process.
- The script would:
    1.  Launch the application.
    2.  Wait for the `<canvas>` element to be present in the DOM.
    3.  Take a screenshot to visually confirm the rendering.

---

## Anti-Patterns to Avoid
- ❌ **Do not** move the `Viewer` component inside the `<Suspense>` boundary. This would defeat the purpose of the fix, as the `Viewer` needs to render immediately to create the mount point for the `three.js` canvas.
- ❌ **Do not** remove the conditional rendering (`voxelWorld && ...`). The `SceneManager` depends on the `voxelWorld` instance, and attempting to render it prematurely will cause errors.
