# Voxelito: AI-Powered Voxel Diorama Generator

Voxelito is a web-based platform that allows users to generate and explore 3D voxel dioramas using natural language. Built with React, Three.js, and Python, it leverages an AI agent to interpret user prompts (e.g., "a cozy cottage in the woods", "a futuristic cyberpunk city") and procedurally generate the corresponding voxel scenes in real-time.

## 🚀 Features

*   **Conversational Interface:** Chat with an AI assistant to describe the scene you want to build.
*   **Real-time Generation:** Watch as the AI parses your intent and streams the scene data to the viewer.
*   **Interactive 3D Viewer:**
    *   **Orbit Controls:** Rotate, zoom, and pan around your creation.
    *   **Selection:** Click on individual voxels to inspect them.
    *   **Neon Visuals:** A stylized, high-contrast aesthetic with a custom neon logo.
*   **Greedy Meshing:** Optimized rendering using a web worker to merge adjacent faces and reduce draw calls.

## 🛠️ Technology Stack

### Frontend
*   **Framework:** React 19 (Vite + TypeScript)
*   **State Management:** Zustand
*   **3D Engine:** Three.js
*   **AI Integration:** CopilotKit (`@copilotkit/react-core`, `@copilotkit/react-ui`)
*   **Styling:** CSS Modules / Global CSS variables

### Backend
*   **Runtime:** Python 3.9+
*   **Framework:** FastAPI
*   **Agent Framework:** `pydantic-ai`
*   **Server:** Uvicorn

## 📋 Prerequisites

Ensure you have the following installed:
-   **Node.js** (v18 or later)
-   **npm** (v9 or later)
-   **Python** (v3.9 or later)
-   **pip** (Python package installer)

## ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd voxelito
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    It is recommended to use a virtual environment.
    ```bash
    # Create virtual environment (optional but recommended)
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate

    # Install requirements
    pip install -r api/requirements.txt
    ```

4.  **Environment Configuration:**
    The backend requires an OpenAI API key.
    Create a `api/.env.local` file (or export the variable in your shell):
    ```env
    OPENAI_API_KEY=sk-your-api-key-here
    ```

## 🏃 Usage

### 1. Start the Backend Server
The backend handles the AI agent logic and scene generation.
```bash
# From the root directory
uvicorn api.index:app --port 8000 --reload
```
The API will be available at `http://localhost:8000`.

### 2. Start the Frontend Development Server
The frontend hosts the 3D viewer and chat interface.
```bash
# In a new terminal window
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 3. Generate a Scene
1.  Click the "Chat" button in the bottom-right corner.
2.  Type a prompt, for example: *"Generate a small island with a palm tree."*
3.  The AI will process your request and the scene will render in the main view.

## 🏗️ Architecture

*   **`src/` (Frontend):**
    *   **`lib/VoxelWorld.ts`**: The core engine class managing the Three.js scene, renderer, and camera.
    *   **`features/voxel-engine/`**: Contains logic for mapping voxel data to meshes, including the `SceneManager` and `palette`.
    *   **`workers/`**: The `greedy-mesher.worker.ts` handles heavy mesh calculation off the main thread.
    *   **`store/`**: Zustand store for managing application state like selections.
    *   **`api/` (Backend):**
        *   **`index.py`**: The FastAPI application defining the agent, Pydantic models, and streaming endpoints.

## 🧪 Testing

### Unit Tests
Run unit tests for the frontend logic (using Vitest):
```bash
npm run test
```

### End-to-End (E2E) Tests
The project uses Playwright for E2E testing.
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npx playwright test
```

### Verification Scripts
Helper scripts in the root directory can be used for quick sanity checks:
-   `python verify_openai.py`: Checks API key validity.
-   `python verify_ui.py`: Launches a headless browser to check if the UI loads.
