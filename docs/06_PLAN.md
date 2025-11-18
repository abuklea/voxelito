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
    -   **Task**: Add and configure the essential libraries for the project: `three`, `@react-three/fiber`, `@react-three/drei`, and `zustand`.
    -   **Files**:
        -   `package.json`: Add new dependencies.
    -   **Step Dependencies**: Step 1.

-   **Step 3: [P] Backend API Setup**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Create an `api/` directory for the serverless function. Initialize a Node.js project and set up a minimal Express server with a health-check endpoint.
    -   **Files**:
        -   `api/package.json`: Backend dependencies.
        -   `api/index.ts`: Express server setup.
        -   `vercel.json`: Configure the serverless function rewrite.
    -   **Step Dependencies**: None.

-   **Step 4: Basic 3D Scene Setup**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Implement the main application component containing the `Canvas` from `react-three-fiber`. Add basic lighting, a ground plane, and `<OrbitControls>` to confirm the 3D environment is functional.
    -   **Files**:
        -   `src/App.tsx`: Main application component.
        -   `src/features/viewer/Viewer.tsx`: The component responsible for the 3D scene.
    -   **Step Dependencies**: Step 2.

-   **Step 5: State Management (Zustand)**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Create the main Zustand store. Define the initial state shape, including slices for `sceneState`, `chatState`, and `uiState`.
    -   **Files**:
        -   `src/store/useStore.ts`: The main Zustand store definition.
        -   `src/types/State.ts`: TypeScript types for the store.
    -   **Step Dependencies**: Step 2.

## Phase 2: Voxel Engine and API Development

-   **Step 6: [P] Core API Endpoint (`/api/generate`)**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Implement the `POST /api/generate` endpoint. It should accept a `prompt` in the request body and, for now, return a mocked, static `AI_SceneDescription` JSON object.
    -   **Files**:
        -   `api/index.ts`: Add the new route handler.
    -   **Step Dependencies**: Step 3.

-   **Step 7: Voxel Data Structures**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Define the core data structures and types for the voxel engine in TypeScript. This includes the `VoxelPalette` and types for chunks and scene data.
    -   **Files**:
        -   `src/features/voxel-engine/types.ts`: Voxel-related type definitions.
        -   `src/features/voxel-engine/palette.ts`: Define the initial voxel type palette.
    -   **Step Dependencies**: Step 1.

-   **Step 8: [P] Voxel Meshing Web Worker**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create the Web Worker script that contains the greedy meshing algorithm. This script will be a pure, self-contained function that receives chunk data and returns serializable geometry data (`vertices`, `indices`, `normals`, `uvs`).
    -   **Files**:
        -   `public/workers/greedy-mesher.worker.ts`: The Web Worker script.
    -   **Step Dependencies**: Step 7.

-   **Step 9: Voxel Scene Manager**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Develop the logic that manages the collection of voxel chunks. This manager will be responsible for identifying which chunks need meshing, communicating with the Web Worker, and creating/updating the `THREE.Mesh` objects in the scene.
    -   **Files**:
        -   `src/features/voxel-engine/SceneManager.tsx`: A React component that orchestrates the voxel rendering.
        -   `src/hooks/useVoxelMesher.ts`: A custom hook to manage the interaction with the meshing worker.
    -   **Step Dependencies**: Step 5, Step 8.

## Phase 3: UI and Feature Integration

-   **Step 10: Chat Panel UI Component**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Build the `ChatPanel` React component based on the style guide. It should display a message history and an input field. Initially, it will only interact with the client-side Zustand store.
    -   **Files**:
        -   `src/features/chat/ChatPanel.tsx`: The main chat UI component.
        -   `src/features/chat/ChatMessage.tsx`: Component for a single message.
    -   **Step Dependencies**: Step 5.

-   **Step 11: Connect Chat UI to Backend**
    -   **Assignee**: `frontend-architect`
    -   **Task**: Wire the `ChatPanel`'s form submission to an API client function that calls the `/api/generate` endpoint. Manage the `isLoading` state in Zustand.
    -   **Files**:
        -   `src/lib/apiClient.ts`: A module for making API calls.
        -   `src/features/chat/ChatPanel.tsx`: Update to call the API on submit.
    -   **Step Dependencies**: Step 6, Step 10.

-   **Step 12: [P] Backend LLM Integration**
    -   **Assignee**: `backend-engineer`
    -   **Task**: Replace the mock data in the `/api/generate` endpoint with a real call to the selected LLM API. Implement secure API key management using environment variables. Add response validation.
    -   **Files**:
        -   `api/index.ts`: Update the route handler to call the LLM.
        -   `.env.local`: For local development API key.
    -   **Step Dependencies**: Step 6.

-   **Step 13: Voxelization of AI Response**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create a utility function that takes the `AI_SceneDescription` JSON from the backend and translates it into the client-side `VoxelScene` data format. Update the Zustand store with this new scene data.
    -   **Files**:
        -   `src/features/voxel-engine/voxelizer.ts`: The translation utility.
        -   `src/store/useStore.ts`: Add an action to update the scene from an AI description.
    -   **Step Dependencies**: Step 7, Step 11.

-   **Step 14: Raycasting for Voxel Selection**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Implement `onPointerDown` event handling on the voxel meshes to perform raycasting. Calculate the intersected voxel coordinates and update the `selection` state in the Zustand store.
    -   **Files**:
        -   `src/features/viewer/InteractionController.tsx`: A component to manage scene interactions.
    -   **Step Dependencies**: Step 9.

-   **Step 15: Selection Highlighting**
    -   **Assignee**: `3d-specialist`
    -   **Task**: Create a visual effect to highlight the selected voxels. This can be done using a separate highlight mesh or a custom shader. The effect should be driven by the `selection` state in the Zustand store.
    -   **Files**:
        -   `src/features/viewer/SelectionHighlighter.tsx`: The component responsible for rendering the highlight.
    -   **Step Dependencies**: Step 14.

## Phase 4: Finalization and Deployment

-   **Step 16: End-to-End Polish and Review**
    -   **Assignee**: `frontend-architect`, `3d-specialist`
    -   **Task**: Review the entire user flow, ensuring all components work together seamlessly. Polish animations, transitions, and handle edge cases like API errors.
    -   **Files**: Various.
    -   **Step Dependencies**: All previous steps.

-   **Step 17: Deployment**
    -   **Assignee**: `devops-engineer`
    -   **Task**: Configure the project for production deployment on Vercel. Set up production environment variables and ensure the CI/CD pipeline runs correctly.
    -   **Files**:
        -   `vercel.json`: Finalize production settings.
    -   **Step Dependencies**: All previous steps.
