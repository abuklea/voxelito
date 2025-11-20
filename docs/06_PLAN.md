# Voxel Diorama Generator - Implementation Plan

This document breaks down the technical specifications into a detailed, step-by-step implementation plan. Each step is designed to be a self-contained unit of work, allowing for iterative development and testing.

## Phase 1: Project Foundation & Core Setup

-   **Step 1: Frontend Project Scaffolding**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Initialize a new web application project using Vite with the React + TypeScript template. Set up basic project structure, including directories for `src/features`, `src/components`, `src/lib`, `src/store`, and `src/types`.
    -   **Files**:
        -   `package.json`: Configure project scripts.
        -   `vite.config.ts`: Initial configuration.
        -   `src/`: Create the directory structure.
    -   **Step Dependencies**: None.

-   **Step 2: Install Core Frontend Dependencies**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Add and configure the essential libraries for the project: `three`, `@react-three/fiber`, `@react-three/drei`, `@copilotkit/react-ui`, and `@copilotkit/react-core`.
    -   **Files**:
        -   `package.json`: Add new dependencies.
    -   **Step Dependencies**: Step 1.

-   **Step 3: [P] Backend API Setup**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Create an `api/` directory for the serverless function. Set up a minimal Python environment with FastAPI and `pydantic-ai`.
    -   **Files**:
        -   `api/index.py`: FastAPI server setup.
        -   `api/requirements.txt`: Python dependencies.
        -   `vercel.json`: Configure the serverless function rewrite.
    -   **Step Dependencies**: None.

-   **Step 4: Basic 3D Scene Setup**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Implement the main application component containing the `Canvas` from `react-three-fiber`. Add basic lighting, a ground plane, and `<OrbitControls>` to confirm the 3D environment is functional.
    -   **Files**:
        -   `src/App.tsx`: Main application component.
        -   `src/features/viewer/Viewer.tsx`: The component responsible for the 3D scene.
    -   **Step Dependencies**: Step 2.

-   **Step 5: Chat UI Setup (CopilotKit)**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Implement the CopilotKit chat components (`<CopilotKit>`, `<CopilotChat>`) in the main application component. Configure the `runtimeUrl` to communicate with the backend.
    -   **Files**:
        -   `src/App.tsx`: Integrate CopilotKit components.
    -   **Step Dependencies**: Step 2.

-   **Step 6: Update STYLE Document**
    -   **Assignee**: `ui-designer`
    -   **Task**: Update the STYLE document to reflect a similar retro-pixel art effect and visual style for the 'voxelito' app UI and art design, that can be seen in the provided screenshots for an unrelated website; with a cool retro style. Use these images as inspiration to envisage and develop a fun, quirky, slightly-mysterious, pixel-art vibe, and a consistent application of this amazing design system across the 'voxelito' app and all ui pages, elements, and components. Use modern css techniques to produce an optimal, performant, and visually cool design for the platform.
    -   **Files**:
        -   `docs/03_STYLE.md`: Update the style guide.
    -   **Step Dependencies**: Step 5.

-   **Step 6b: Implement Retro-Pixel Art UI**
    -   **Assignee**: `frontend-developer`
    -   **Task**: Following the STYLE document created in PRP P1S6, update the existing project, and update the UI, to integrate/implement the required UI changes, for the app to reflect a similar retro-pixel art vibe, and this pixel visual style for the 'voxelito' app UI and art design, that can be seen in the provided screenshots for an unrelated website; with a cool retro style. Use these images as inspiration to envisage and develop a fun, quirky, slightly-mysterious, pixel-art vibe, and a consistent application of this amazing design system across the 'voxelito' app and all ui pages, elements, and components. Use modern css techniques to produce an optimal, performant, and visually cool design for the platform.
    -   **Files**:
        -   `src/index.css`: Apply global styles.
        -   `src/App.tsx`: Update component styles.
    -   **Step Dependencies**: Step 6.

## Phase 2: Voxel Engine and API Development

-   **Step 7: [P] Core API Endpoint (`/api/generate`)**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Implement the `POST /api/generate` endpoint in the FastAPI application. This endpoint will receive requests from the `ag-ui` frontend, pass the prompt to a `pydanticAI` agent, and stream events back to the client according to the `ag-ui` protocol.
    -   **Files**:
        -   `api/index.py`: Add the route handler.
    -   **Step Dependencies**: Step 3.

-   **Step 8: Voxel Data Structures**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Define the core data structures and types for the voxel engine in TypeScript. This includes the `VoxelPalette` and types for chunks and scene data.
    -   **Files**:
        -   `src/features/voxel-engine/types.ts`: Voxel-related type definitions.
        -   `src/features/voxel-engine/palette.ts`: Define the initial voxel type palette.
    -   **Step Dependencies**: Step 1.

-   **Step 9: [P] Voxel Meshing Web Worker**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create the Web Worker script that contains the greedy meshing algorithm. This script will be a pure, self-contained function that receives chunk data and returns serializable geometry data (`vertices`, `indices`, `normals`, `uvs`).
    -   **Files**:
        -   `public/workers/greedy-mesher.worker.ts`: The Web Worker script.
    -   **Step Dependencies**: Step 8.

-   **Step 10: Voxel Scene Manager**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Develop the logic that manages the collection of voxel chunks. This manager will be responsible for identifying which chunks need meshing, communicating with the Web Worker, and creating/updating the `THREE.Mesh` objects in the scene.
    -   **Files**:
        -   `src/features/voxel-engine/SceneManager.tsx`: A React component that orchestrates the voxel rendering.
        -   `src/hooks/useVoxelMesher.ts`: A custom hook to manage the interaction with the meshing worker.
    -   **Step Dependencies**: Step 9.

-   **Step 10b: Fix Silent Rendering Failure**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Resolve the silent rendering failure caused by a React Suspense deadlock. This involves wrapping the `SceneManager` component in a `<Suspense>` boundary in `src/App.tsx` to allow the main `Viewer` component to render and initialize the `three.js` canvas correctly.
    -   **Files**:
        -   `src/App.tsx`: Apply the `<Suspense>` boundary.
    -   **Step Dependencies**: Step 10.

## Phase 3: UI and Feature Integration

-   **Step 11: [P] Backend LLM Integration**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Integrate a real LLM with the `pydanticAI` agent in the backend. Implement secure API key management using environment variables. Add response validation and error handling.
    -   **Files**:
        -   `api/index.py`: Update the agent to call the LLM.
        -   `.env.local`: For local development API key.
    -   **Step Dependencies**: Step 7.

-   **Step 12: Voxelization of AI Response**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create a utility function that takes the `AI_SceneDescription` from the backend events and translates it into the client-side `VoxelScene` data format. Update the scene data based on the events received from the `ag-ui` stream.
    -   **Files**:
        -   `src/features/voxel-engine/voxelizer.ts`: The translation utility.
    -   **Step Dependencies**: Step 8, Step 11.

-   **Step 13: Raycasting for Voxel Selection**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Implement `onPointerDown` event handling on the voxel meshes to perform raycasting. Calculate the intersected voxel coordinates and send the selection to the backend via the `ag-ui` agent.
    -   **Files**:
        -   `src/features/viewer/InteractionController.tsx`: A component to manage scene interactions.
    -   **Step Dependencies**: Step 10.

-   **Step 14: Selection Highlighting**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create a visual effect to highlight the selected voxels. This can be done using a separate highlight mesh or a custom shader. The effect should be driven by the `selection` state in the Zustand store.
    -   **Files**:
        -   `src/features/viewer/SelectionHighlighter.tsx`: The component responsible for rendering the highlight.
    -   **Step Dependencies**: Step 13.

## Phase 4: Finalization and Deployment

-   **Step 15: End-to-End Polish and Review**
    -   **Assignee**: `frontend-architect`, `3d-specialist`
    -   **Task**: Review the entire user flow, ensuring all components work together seamlessly. Polish animations, transitions, and handle edge cases like API errors.
    -   **Files**: Various.
    -   **Step Dependencies**: All previous steps.

-   **Step 16: Deployment**
    -   **Assignee**: `devops-engineer`
    -   **Task**: Configure the project for production deployment on Vercel. Set up production environment variables and ensure the CI/CD pipeline runs correctly.
    -   **Files**:
        -   `vercel.json`: Finalize production settings.
    -   **Step Dependencies**: All previous steps.
