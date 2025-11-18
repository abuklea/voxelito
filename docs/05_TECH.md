# Voxel Diorama Generator - Technical Specifications

<brainstorm>
### 1. Project Analysis & Planning

*   **System Architecture:** A client-server model is appropriate. The client will be a Single Page Application (SPA) handling all rendering and user interaction. The backend will be a lightweight, stateless API service that acts as a secure proxy to the AI model. This decouples the frontend from the specific AI provider and protects API keys.
*   **Core Functionality Breakdown:**
    *   **Frontend (SPA):**
        *   3D Rendering Engine: Manages the Three.js scene, camera, lights, and controls.
        *   Voxel Engine Logic: Handles voxel data structures (chunks, octrees), meshing (greedy meshing), and updates.
        *   State Management: Manages the application state, including the current voxel scene, chat history, and UI state.
        *   UI Components: React components for the chat panel, toolbars, and other UI elements.
        *   Interaction Logic: Implements raycasting for voxel selection and camera controls.
    *   **Backend (API Service):**
        *   API Endpoint: A single endpoint to receive user prompts and scene context.
        *   AI Integration: Communicates with the chosen LLM, providing it with a carefully crafted prompt and a schema for the desired JSON output.
        *   Security: Manages the LLM API key securely.
*   **Data Models:**
    *   `VoxelScene`: The primary data structure on the client, representing the entire diorama. It will contain a map of chunks.
    *   `VoxelChunk`: A fixed-size (e.g., 32x32x32) container for voxel data.
    *   `VoxelPalette`: A global array defining all available voxel types by an integer index.
    *   `AI_SceneDescription`: The structured JSON format the LLM will output. This will be a descriptive format (e.g., list of objects with positions, sizes, voxel types) that the client will then translate into the `VoxelScene` data structure.
*   **API Specification:**
    *   A single endpoint `POST /api/generate` is sufficient for the MVP.
    *   Request Body: `{ prompt: string, sceneState?: VoxelScene, selection?: VoxelSelection }`.
    *   Response Body: `{ newScene: AI_SceneDescription }`.
*   **Technology Stack Choices:**
    *   **Frontend:** React with Vite for a fast development experience. `react-three-fiber` and `drei` for a declarative and component-based approach to Three.js. Zustand for simple, effective state management.
    *   **Backend:** Node.js with Express, deployed as a serverless function for scalability and cost-effectiveness.
    *   **Deployment:** Vercel is an excellent choice as it seamlessly handles deployment for the React frontend and the serverless backend, providing CI/CD out of the box.
*   **Project Structure (Frontend):**
    *   A feature-based structure will be used for scalability.
    *   `/src/features/` will contain directories for `chat`, `viewer`, `voxel-engine`.
    *   `/src/components/` for shared, reusable UI components.
    *   `/src/lib/` for core Three.js setup and helpers.
    *   `/src/store/` for the Zustand state management store.
    *   `/src/types/` for all TypeScript type definitions.
*   **Risks & Mitigations:**
    *   **Performance:** Greedy meshing is computationally intensive. **Mitigation:** Implement it within a Web Worker to avoid blocking the main thread.
    *   **AI Reliability:** The LLM may not always return valid or coherent JSON. **Mitigation:** The backend will include robust validation and error handling, with a retry mechanism. The client will show a user-friendly error in the chat.
    *   **Cost:** LLM APIs can be expensive. **Mitigation:** Implement rate limiting on the backend and choose an efficient model. The Freemium model will help manage costs.

</brainstorm>

# Voxel Diorama Generator - Technical Specifications

## 1. Executive Summary
-   **Project Overview:** This document provides the technical specifications for a web-based platform that enables users to generate and edit 3D voxel dioramas through a conversational AI interface.
-   **Key Technical Decisions:** The architecture is a modern, decoupled web application. The frontend is a React SPA for a rich, interactive user experience, utilizing Three.js for high-performance 3D rendering and `ag-ui` for agent interaction. The backend is a Python serverless function using `pydanticAI`, ensuring scalability and security for AI model interactions.
-   **High-level Architecture Diagram:**
    ```mermaid
    graph TD
        subgraph "User's Browser"
            A[React SPA with ag-ui] -- Manages --> B(Three.js Canvas);
            A -- Handles State & Events --> A;
            B -- User Interaction --> D[Raycasting/Controls];
        end

        subgraph "Cloud (Vercel)"
            F[Serverless Function - Python/FastAPI/pydanticAI] -- Securely Calls --> G[LLM API];
        end

        A -- ag-ui Protocol (HTTPS) --> F;
        F -- ag-ui Event Stream --> A;
    ```
-   **Technology Stack Recommendations:**
    -   **Frontend:** React, TypeScript, Vite, Three.js, React Three Fiber, `@copilotkit/react-ui`.
    -   **Backend:** Python, FastAPI, `pydanticAI` (running in a Serverless Function).
    -   **Deployment:** Vercel.

## 2. System Architecture

### 2.1 Architecture Overview
The system is composed of two primary components:
1.  **Client Application:** A Single Page Application (SPA) built with React. It is responsible for all UI, 3D rendering, and client-side state management. It communicates with the backend via a RESTful API.
2.  **Backend API:** A lightweight Python service using `pydanticAI`. Its responsibility is to receive requests from the client via the `ag-ui` protocol, communicate with the LLM API, and stream events back to the client.

### 2.2 Technology Stack
-   **Frontend:**
    -   **Framework:** React 18+
    -   **Build Tool:** Vite
    -   **Language:** TypeScript
    -   **3D Rendering:** Three.js with React Three Fiber (`@react-three/fiber`) and Drei (`@react-three/drei`) for declarative scene graph and helpful abstractions.
    -   **State Management & Agent Communication:** `@copilotkit/react-ui` and `@copilotkit/react-core`.
-   **Backend:**
    -   **Runtime:** Python 3.9+
    -   **Framework:** FastAPI with `pydanticAI`.
-   **Third-party Services:**
    -   **AI Model:** An API-accessible LLM capable of generating structured JSON (e.g., OpenAI's GPT-4, Google's Gemini).

## 3. Feature Specifications

### 3.1 3D Voxel Scene Rendering
-   **User Stories:** As a user, I want to view a 3D voxel scene and interact with it using intuitive camera controls (orbit, pan, zoom).
-   **Technical Requirements:**
    -   The scene must be rendered using WebGL2 via Three.js.
    -   A chunk-based system (32x32x32 chunks) will be used to manage the world.
    -   A greedy meshing algorithm will be implemented in a Web Worker to generate optimized meshes for each chunk, preventing UI blocking.
    -   Instanced rendering will be utilized for performance-critical, repeating elements if necessary.
-   **Implementation Approach:**
    1.  A main `<Canvas>` component from `react-three-fiber` will host the 3D experience.
    2.  `<OrbitControls>` from `drei` will provide camera interaction.
    3.  A `VoxelScene` component will manage the collection of chunks and their meshes.
    4.  When scene data changes, the `VoxelScene` component will identify dirty chunks, post them to the meshing worker, and update the corresponding `THREE.Mesh` in the scene upon receiving the new geometry.

### 3.2 AI-Powered Chat Interface
-   **User Stories:** As a user, I want to type natural language prompts to generate and modify the 3D scene.
-   **Technical Requirements:**
    -   The UI will feature a floating chat panel component.
    -   The component will manage a history of user prompts and AI responses.
    -   It will display a loading state while waiting for the backend response.
-   **Implementation Approach:**
    1.  The main application will be wrapped in a `<CopilotKit>` provider from `@copilotkit/react-core`.
    2.  The `runtimeUrl` prop will be configured to point to the `/api/generate` backend endpoint.
    3.  The UI will be composed of `<CopilotChat>` components from `@copilotkit/react-ui`.
    4.  State management, including message history and loading states, is handled internally by the CopilotKit components.

### 3.3 Voxel Selection and Editing
-   **User Stories:** As a user, I want to select a voxel or group of voxels to target my AI commands.
-   **Technical Requirements:**
    -   Raycasting must be used to determine the intersection point of a mouse click with the diorama mesh.
    -   The intersected face normal must be used to determine if the user clicked an existing voxel or an empty space adjacent to one.
    -   Selected voxels must be visually highlighted.
-   **Implementation Approach:**
    1.  An `onClick` event handler on the voxel meshes will use the Three.js `Raycaster`.
    2.  The selection state (a list of selected voxel coordinates) will be managed in the Zustand store.
    3.  A separate "highlight" mesh or a custom shader will be used to render the selection visualization based on the coordinates in the store.
    4.  When making an API call, the selection data from the store will be included in the request payload.

## 4. Data Architecture

### 4.1 Data Models
-   **`VoxelType` (in VoxelPalette.ts):**
    -   `id`: `number` (integer index)
    -   `name`: `string`
    -   `color`: `[number, number, number]` (RGB)
-   **`VoxelScene` (client-side):**
    -   A `Map<string, Uint16Array>` where the key is the chunk coordinate (e.g., `"0,0,0"`) and the value is the voxel data for that chunk (an array of `VoxelType` IDs).
-   **`AI_SceneDescription` (JSON from LLM):**
    ```json
    {
      "objects": [
        {
          "name": "house",
          "position": [10, 0, 10],
          "size": [8, 6, 8],
          "voxelType": 5 // e.g., "brick"
        },
        {
          "name": "tree",
          "position": [20, 0, 15],
          "shape": "cone",
          "size": [5, 10, 5],
          "voxelType": 8 // e.g., "log"
        }
      ]
    }
    ```

## 5. API Specifications

### 5.1 Internal APIs
-   **Endpoint:** `POST /api/generate`
-   **Description:** Handles communication with the `pydanticAI` agent based on the `ag-ui` protocol.
-   **Communication Protocol:** The frontend and backend will communicate using the `ag-ui` event-based protocol. The frontend sends user input, and the backend responds with a stream of events (e.g., `message`, `stream_start`, `stream_chunk`, `stream_end`). The structure of these events is defined by the `ag-ui` specification.

## 6. Security and Privacy

-   **Authentication:** Not included in MVP. For future implementation, consider OAuth 2.0.
-   **Data Security:** All communication between the client and backend will be over HTTPS. The LLM API key will be stored as an environment variable on the backend and never exposed to the client.
-   **Application Security:** Basic rate limiting will be applied to the `/api/generate` endpoint to prevent abuse.

## 7. User Interface Specifications

This section directly references the `03_STYLE.md` and `04_UI.md` documents. The implementation will adhere strictly to the defined color palette, typography, component styles, and interaction flows.

## 8. Infrastructure and Deployment

-   **Infrastructure:** The project will be hosted on Vercel. The backend Python/Flask app will be configured as a Vercel Serverless Function.
-   **Deployment Strategy:**
    -   A CI/CD pipeline will be automatically configured via the Vercel GitHub integration.
    -   Every push to the `main` branch will trigger a production deployment.
    -   Every pull request will generate a unique preview deployment URL for testing.
    -   Environment variables (like the LLM API key) will be managed through the Vercel project settings.
