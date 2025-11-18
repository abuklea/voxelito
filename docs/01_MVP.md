# Voxel Diorama Generator - MVP Technical Specification

This document outlines the Minimum Viable Product (MVP) for the Voxel Diorama Generator, detailing the core features and the technical approach for implementation.

## Features (MVP)

### 3D Voxel Scene Rendering
This feature is the core of the application, responsible for rendering the 3D voxel diorama. It will use Three.js and WebGL2 to create a performant, interactive 3D environment that runs smoothly in the browser. The system will employ chunk-based meshing and greedy meshing algorithms to optimize rendering performance for small to medium-sized scenes.

#### Technology
- **Three.js:** A comprehensive 3D library for creating and displaying animated 3D computer graphics in a web browser.
- **WebGL2:** To enable advanced rendering features like 3D textures and instanced rendering.
- **TypeScript:** For type safety and better maintainability of the complex 3D data structures.

#### Requirements
- Must render scenes of at least 64x64x64 voxels at 60 FPS on modern hardware.
- Must support intuitive camera controls: orbit, pan, and zoom.
- Voxel data structure should be optimized for memory and rendering speed, using a hybrid sparse voxel octree and chunking approach.

#### Integration
This is the central component of the application. The AI generation feature will provide the scene data, which this component will then render. The voxel selection feature will interact with the rendered scene to identify and highlight specific voxels.

### AI-Powered Chat Interface
This feature provides the conversational interface for users to generate and modify the diorama. It will consist of a floating chat panel where users can type prompts. The backend will interface with a Large Language Model (LLM) to parse these prompts and translate them into structured scene data.

#### Technology
- **React/Vue/Svelte:** A modern JavaScript framework for building the UI components, including the chat panel.
- **LLM API (e.g., OpenAI, Gemini):** To process natural language prompts and generate structured JSON representing the scene.
- **Node.js/Express.js:** For the backend server that will handle API requests to the LLM.

#### Requirements
- The chat interface must be non-intrusive and allow the user to see the 3D scene.
- The LLM must be prompted to return data in a predefined, structured JSON format.
- The system needs to handle the state of the conversation to allow for iterative modifications to the scene.

#### Integration
The chat interface is the primary input method for the user. It sends user prompts to the backend, receives the generated scene data, and then passes this data to the 3D Voxel Scene Rendering component to update the visual representation of the diorama.

### Voxel Selection and Highlighting
This feature allows users to select individual voxels or groups of voxels. This selection will then be used to target subsequent AI commands. Raycasting will be used to determine which voxel the user is pointing at.

#### Technology
- **Three.js Raycaster:** To project a ray from the camera through the mouse position and detect intersections with the voxel mesh.
- **Custom Shaders/Materials:** To visually highlight the selected voxels without significantly impacting performance.

#### Requirements
- The selection must be precise and responsive.
- The highlighting should be clear but not obscure the scene.
- The system must be able to handle single voxel and multi-voxel selections.

#### Integration
This feature links the user's interaction with the 3D scene back to the AI. The selected voxel data will be sent along with the user's next chat prompt to provide context to the LLM, allowing for targeted edits.

## System Diagram

```mermaid
graph TD
    subgraph Browser (Client)
        A[UI - Chat Panel] -->|User Prompt| B{3D Rendering Engine - Three.js};
        B -->|Scene Data| C[Voxel Scene];
        C -->|Raycasting for Selection| D[Voxel Selection];
        D -->|Selected Voxels| A;
    end

    subgraph Server (Backend)
        E[API Server - Node.js] -->|Prompt + Schema| F{LLM API};
        F -->|Structured JSON| E;
    end

    A -->|API Request| E;
    E -->|Scene Data| B;

```

## List of Technical/Architecture Consideration Questions
- **LLM Choice:** Which specific LLM provides the best balance of cost, performance, and ability to generate structured JSON for this use case?
- **Data Structure:** What are the optimal chunk sizes and octree depth for the target diorama complexity?
- **Real-time Updates:** How do we efficiently update the 3D mesh when only a small part of the scene is changed by an AI command?
- **State Management:** What is the best way to manage the state of the scene on the client and sync it with the server and the AI's understanding of the scene?
- **Performance on Mobile:** What specific optimizations will be needed to ensure a smooth experience on mobile devices with less processing power?
- **Voxel Palette:** How will the initial, extensive voxel type palette be defined, stored, and made available to the AI and the rendering engine?
