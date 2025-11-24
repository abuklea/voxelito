# Legacy Code Analysis - Voxelito

## Introduction
This document outlines the investigation into potential "ghost" or legacy code within the Voxelito project. As the project has evolved from potentially different backend architectures (Express to FastAPI), artifacts may remain.

## Methodology
The analysis was performed by comparing the current active codebase against the file structure and checking for cross-references.
*   **Active Backend:** Python (FastAPI) located in `api/index.py`.
*   **Active Frontend:** React (Vite) located in `src/`.

## Identified Candidates

### Candidate 1: `api/package.json` and `api/package-lock.json`
*   **Location:** `api/` directory.
*   **Content:** Defines an `express` dependency and scripts for a Node.js backend.
*   **Status:** **UNUSED**.
*   **Evidence:**
    *   The project documentation (`README.md`) explicitly instructs to run the backend using `uvicorn api.index:app`.
    *   The frontend `vite.config.ts` proxies `/api` to port 8000 (default FastAPI/Uvicorn port), whereas this file suggests a backend on port 3001.
    *   No scripts in the root `package.json` reference this file.
*   **Recommendation:** **REMOVE**. These files are misleading and add unnecessary node_modules if `npm install` were run in that directory.

### Candidate 2: `api/index.ts`
*   **Location:** `api/` directory.
*   **Content:** A simple Express server file.
*   **Status:** **UNUSED**.
*   **Evidence:**
    *   The file explicitly states in a comment: *"Note: The main backend logic for the Voxel Agent is currently handled by the Python FastAPI application in index.py."*
    *   It is not imported or run by any active script.
*   **Recommendation:** **REMOVE**. It serves only as a confusing artifact.

### Candidate 3: `test_api.py`
*   **Location:** Root directory.
*   **Content:** A Python script using `requests` to hit `http://localhost:8000/api/generate`.
*   **Status:** **USEFUL DEV TOOL**.
*   **Evidence:**
    *   It is a manual integration test for the backend.
    *   While not part of the CI pipeline (which uses Playwright), it is valuable for quick backend debugging without running the frontend.
*   **Recommendation:** **KEEP**. Consider renaming to `scripts/test_api_manual.py` to clarify it is not a pytest file.

### Candidate 4: Verification Scripts (`verify_*.py`)
*   **Location:** Root directory.
*   **Content:** Various Selenium/Playwright scripts (`verify_ui.py`, `verify_openai.py`, etc.).
*   **Status:** **USEFUL DEV TOOLS**.
*   **Evidence:**
    *   Referenced in `README.md` as helper scripts.
    *   Used for environment verification (API keys, Browser launch).
*   **Recommendation:** **KEEP**. These are essential for environment setup verification.

## Refactoring Opportunities

### Backend Stream Handler
*   **Location:** `api/index.py` -> `stream_handler`.
*   **Issue:** The manual construction of the GraphQL-like JSON response string is verbose and error-prone.
    ```python
    yield f"data: {json.dumps(graphql_response)}\n\n"
    ```
*   **Proposal:** Create a dedicated helper class or function `CopilotResponseBuilder` to handle the formatting of these messages, separating the protocol details from the business logic.

### Texture Atlas Generation
*   **Location:** `src/features/voxel-engine/TextureManager.ts`.
*   **Issue:** The generation happens on the main thread during initialization.
*   **Proposal:** Move this logic to a Web Worker, similar to the Greedy Mesher, to prevent any potential startup jank, especially as the number of textures grows.

## Summary of Actions

| File/Component | Status | Action |
| :--- | :--- | :--- |
| `api/package.json` | Legacy | **Delete** |
| `api/package-lock.json` | Legacy | **Delete** |
| `api/index.ts` | Legacy | **Delete** |
| `test_api.py` | Utility | **Keep** |
| `verify_*.py` | Utility | **Keep** |
| `api/pipeline` | Core | **Keep** (Active Feature) |
