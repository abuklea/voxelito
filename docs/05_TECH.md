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
-   **Key Technical Decisions:** The architecture is a modern, decoupled web application. The frontend is a React SPA for a rich, interactive user experience, utilizing Three.js for high-performance 3D rendering. The backend is a stateless Node.js serverless function, ensuring scalability and security for AI model interactions.
-   **High-level Architecture Diagram:**
    ```mermaid
    graph TD
        subgraph "User's Browser"
            A[React SPA] -- Manages --> B(Three.js Canvas);
            A -- Interacts with --> C{Zustand State Store};
            B -- User Interaction --> D[Raycasting/Controls];
        end

        subgraph "Cloud (Vercel)"
            F[Serverless Function - Node.js] -- Securely Calls --> G[LLM API];
        end

        A -- API Request (HTTPS) --> F;
        F -- JSON Response --> A;
    ```
-   **Technology Stack Recommendations:**
    -   **Frontend:** React, TypeScript, Vite, Three.js, React Three Fiber, Zustand.
    -   **Backend:** Node.js, Express (running in a Serverless Function).
    -   **Deployment:** Vercel.

## 2. System Architecture

### 2.1 Architecture Overview
The system is composed of two primary components:
1.  **Client Application:** A Single Page Application (SPA) built with React. It is responsible for all UI, 3D rendering, and client-side state management. It communicates with the backend via a RESTful API.
2.  **Backend API:** A lightweight, stateless Node.js service. Its sole responsibility is to receive requests from the client, securely communicate with the LLM API, validate the response, and forward it back to the client.

### 2.2 Technology Stack
-   **Frontend:**
    -   **Framework:** React 18+
    -   **Build Tool:** Vite
    -   **Language:** TypeScript
    -   **3D Rendering:** Three.js with React Three Fiber (`@react-three/fiber`) and Drei (`@react-three/drei`) for declarative scene graph and helpful abstractions.
    -   **State Management:** Zustand for lightweight, centralized state management.
-   **Backend:**
    -   **Runtime:** Node.js 20+
    -   **Framework:** Express.js
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
    1.  A `ChatPanel` React component will be created.
    2.  The Zustand store will hold the chat history array.
    3.  When the user submits a prompt, an async function will be called to `POST` the data to the backend API. During this time, a `isLoading` flag in the store will be set to `true`.
    4.  Upon receiving a response, the new scene data is updated in the store, and the `isLoading` flag is set to `false`.

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
-   **Description:** Takes a user prompt and optional current scene context, and returns a new AI-generated scene description.
-   **Request Body Schema:**
    ```json
    {
      "prompt": "string",
      "selection": {
        "voxels": [[number, number, number]]
      }
    }
    ```
-   **Response Schema (Success - 200 OK):**
    -   Body: `AI_SceneDescription` (as defined in 4.1).
-   **Response (Error - 500 Internal Server Error):**
    ```json
    {
      "error": "Failed to generate scene."
    }
    ```

## 6. Security and Privacy

-   **Authentication:** Not included in MVP. For future implementation, consider OAuth 2.0.
-   **Data Security:** All communication between the client and backend will be over HTTPS. The LLM API key will be stored as an environment variable on the backend and never exposed to the client.
-   **Application Security:** Basic rate limiting will be applied to the `/api/generate` endpoint to prevent abuse.

## 7. User Interface Specifications

This section directly references the `03_STYLE.md` and `04_UI.md` documents. The implementation will adhere strictly to the defined color palette, typography, component styles, and interaction flows.

## 8. Infrastructure and Deployment

-   **Infrastructure:** The project will be hosted on Vercel. The backend Node.js/Express app will be configured as a Vercel Serverless Function.
-   **Deployment Strategy:**
    -   A CI/CD pipeline will be automatically configured via the Vercel GitHub integration.
    -   Every push to the `main` branch will trigger a production deployment.
    -   Every pull request will generate a unique preview deployment URL for testing.
    -   Environment variables (like the LLM API key) will be managed through the Vercel project settings.
