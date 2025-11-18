# Voxel Diorama Generator

This project is a web-based platform for generating and editing 3D voxel diorama scenes using a conversational AI interface. Users can describe a scene in a chat window, and the AI will build it, allowing for iterative modifications and exploration in a beautifully rendered 3D environment.

## 1. Technology Stack

-   **Frontend:**
    -   **Framework:** React 19 (with Vite and TypeScript)
    -   **3D Rendering:** `three`, `@react-three/fiber`, `@react-three/drei`
    -   **Agent Communication:** `@copilotkit/react-core`, `@copilotkit/react-ui`
-   **Backend:**
    -   **Runtime:** Python 3.9+
    -   **Framework:** `FastAPI`
    -   **AI Agent:** `pydantic-ai`
-   **Deployment:**
    -   **Platform:** Vercel

## 2. Getting Started

### Prerequisites

-   Node.js (v20 or later)
-   npm (v10 or later)
-   Python (v3.9 or later)
-   pip

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Install backend dependencies:**
    ```bash
    pip install -r api/requirements.txt
    ```

### Running the Application

1.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

2.  **Start the backend server:**
    ```bash
    uvicorn api.index:app --port 8000
    ```
    The backend server will be available at `http://localhost:8000`.

## 3. Project Structure

-   `api/`: Contains the Python/FastAPI backend code.
-   `docs/`: Contains detailed project documentation, including the project brief, MVP, and implementation plan.
-   `PRPs/`: Contains Project Realization Plans (PRPs) for each implementation step.
-   `public/`: Contains static assets for the frontend.
-   `src/`: Contains the React/TypeScript frontend code.
    -   `features/`: Contains the main features of the application (e.g., `viewer`, `chat`).
    -   `components/`: Contains reusable React components.
    -   `lib/`: Contains utility functions and libraries.
-   `.gemini/`: Contains Gemini-specific commands and configurations.

## 4. Development Process

This project follows a structured development process using Project Realization Plans (PRPs). Each step in the implementation plan is documented with a PRP, which outlines the goals, context, and implementation details for that step. This ensures that each change is well-defined and easy to review.
