# Project Memory: Voxelito

This document serves as a centralized, living record of the project's state, architecture, key decisions, and implementation learnings. Its purpose is to ensure consistency and adherence to best practices throughout the development lifecycle.

## 1. Project Overview & Goal
**Voxelito** is a web-based platform for generating and editing 3D voxel diorama scenes. The core feature is a conversational AI interface that allows users to create and modify scenes through natural language chat prompts. The platform targets a broad audience, from hobbyists to designers, by making 3D content creation intuitive and accessible.

**Branding:** Dark, retro-futuristic "cyber-voxel" aesthetic (Neon/Dark Mode).
**Current Version:** Alpha Build (Phase 4 Polish).

## 2. System Architecture
The application follows a decoupled client-server model:

-   **Frontend (Client):** React 18 SPA with Vite and TypeScript.
    -   **Rendering:** Three.js (WebGL) with custom Voxel Engine.
    -   **State Management:** Zustand (`voxelStore`, `notificationStore`) for reactive state.
    -   **AI Integration:** CopilotKit for chat UI and context management.
-   **Backend (Server):** Python FastAPI service.
    -   **Agent:** `pydantic-ai` with OpenAI GPT-4o.
    -   **Protocol:** Server-Sent Events (SSE) streaming JSON-serialized GraphQL responses.
-   **Deployment:** Vercel (Frontend + Serverless Function).

## 3. Technology Stack
-   **Frontend:**
    -   React 18, TypeScript, Vite
    -   Three.js, @react-three/fiber (not used, pure Three.js managed by React wrapper)
    -   @copilotkit/react-core, @copilotkit/react-ui
    -   Zustand
-   **Backend:**
    -   Python 3.9+
    -   FastAPI, Uvicorn
    -   Pydantic AI, OpenAI SDK
-   **Testing:**
    -   Playwright (E2E)
    -   Vitest (Unit - currently minimal)

## 4. Implementation Status (Phase 4: Polish)
The project is in the final polish phase (P4S15).

-   **[✓] Core Engine:** Voxel rendering, Chunk management, Greedy meshing (Web Worker).
-   **[✓] AI Generation:** Scene generation from text, Context awareness (selection, screenshot).
-   **[✓] Tools:** Cursor, Box, Sphere selection tools. Modes: Replace, Add, Subtract.
-   **[✓] UI:** Toolbar, Responsive Header, CopilotPopup, Toast Notifications.
-   **[✓] Grid System:** Aligned with voxel boundaries (unit steps), added Toggle control.
-   **[✓] Polish:** Error handling, Loading states, Mobile responsiveness (in progress).

## 5. Key Technical Decisions & Learnings

### 5.1. Backend-Frontend Communication
-   **Stream Handling:** The backend streams data using SSE. To support CopilotKit's expected format without a dedicated adapter, we manually construct GraphQL-like JSON responses.
-   **Error Handling:** Errors are trapped at multiple levels. Critical errors return structured JSON objects that are displayed as Toast notifications on the frontend. Less critical errors are logged.
-   **Rate Limiting:** Implemented a simple in-memory rate limiter (IP-based) to prevent abuse.

### 5.2. Voxel Engine Optimization
-   **Meshing:** Greedy meshing is performed in a Web Worker to prevent UI freezing.
-   **Texture Atlas:** A dynamic texture atlas is generated at runtime to support voxel rendering with a single draw call per chunk material.
-   **Memory Management:** `VoxelWorld` handles disposal of Three.js resources (geometries, materials) when chunks are removed to prevent memory leaks.

### 5.3. Interaction System
-   **Selection Logic:** Selection is handled by `InteractionController` using Raycasting.
-   **Limits:** Selection size is capped at 10,000 voxels to prevent performance degradation during rendering (InstancedMesh) and network transmission.
-   **Visuals:** `SelectionHighlighter` uses `THREE.InstancedMesh` for efficient rendering of thousands of selection highlights.

### 5.4. CopilotKit Integration
-   **Message Parsing:** The frontend monitors the chat stream. When a message contains a valid JSON block with `chunks`, it merges this data into the scene.
-   **Context:** `useCopilotReadable` provides the agent with current scene data, selection coordinates, and a viewport screenshot.

### 5.5. Testing Strategy
-   **E2E First:** Primary verification is done via Playwright tests in `e2e/`, covering complex scenarios like "Large Scene", "Dialogue", and "Editing".
-   **Visual Verification:** Tests capture screenshots for manual review.

## 6. Known Limitations
-   **Performance:** Large scenes (>500x500x500) may still cause frame drops during generation/meshing.
-   **Mobile:** 3D navigation on mobile is basic (touch supported by OrbitControls but UI can be cramped).
-   **Persistence:** No backend database; scenes are lost on refresh (unless user saves manually - feature pending).

## 7. Future Enhancements
-   **Save/Load:** Implement cloud storage for scenes.
-   **Multiplayer:** Real-time collaboration using WebSockets.
-   **Export:** Export to OBJ/GLTF.
