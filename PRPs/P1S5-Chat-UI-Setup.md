name: "PRP for P1S5 - Chat UI Setup"
description: "A plan to integrate the CopilotKit chat UI into the frontend application."

---

## Goal
Implement the CopilotKit chat components (`<CopilotKit>`, `<CopilotChat>`) in the main application component (`src/App.tsx`) and configure the `runtimeUrl` to communicate with the backend API.

## Why
-   **Business value**: This is the primary user interface for interacting with the AI-powered scene generation feature.
-   **Integration**: It connects the frontend UI with the backend agent service.
-   **Problems solved**: Provides a direct, intuitive way for users to input natural language commands to build and modify 3D scenes.

## What
The task involves modifying the main `App` component to include the necessary UI components from the `@copilotkit/react-ui` library, enabling the chat functionality.

### Success Criteria
-   [ ] The application renders without any new errors after the changes.
-   [ ] The CopilotKit chat widget is visible on the screen.
-   [ ] The chat widget is configured to send requests to the `/api` endpoint.

## All Needed Context

### Documentation & References
```yaml
- doc: https://docs.copilotkit.ai/getting-started/quickstart-react
  why: Official documentation for setting up the basic CopilotKit components.

- file: docs/06_PLAN.md
  why: Outlines the high-level requirement for this step (P1S5).

- file: src/App.tsx
  why: The file that will be modified.

- file: memory.md
  why: Provides context on the overall project architecture and tech stack.
```

### Known Gotchas of our codebase & Library Quirks
```typescript
// CRITICAL: The <Canvas> component from @react-three/fiber must have a style prop
// with a defined height (e.g., style={{ height: '100%' }}) to be visible.
// While not directly modified in this step, the chat UI will overlay this canvas,
// so its correct rendering is essential.
```

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
MODIFY src/App.tsx:
  - IMPORT the following components:
    - `import { CopilotKit } from "@copilotkit/react-core";`
    - `import { CopilotChat } from "@copilotkit/react-ui";`
    - `import "@copilotkit/react-ui/styles.css";`
  - WRAP the existing `Viewer` component with the `<CopilotKit>` provider.
  - SET the `runtimeUrl` prop of `<CopilotKit>` to `"/api"`.
  - ADD the `<CopilotChat />` component inside the main App div.
```

### Per task pseudocode as needed added to each task
```typescript
// Task 1: Modify src/App.tsx

import "./App.css";
import "@copilotkit/react-ui/styles.css"; // CRITICAL: Import styles
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import Viewer from "./features/viewer/Viewer";

function App() {
  return (
    // PATTERN: Wrap the application with the provider
    <CopilotKit runtimeUrl="/api">
      <div id="root-container">
        {/* The 3D viewer will be the background */}
        <Viewer />

        {/* The chat UI will overlay the viewer */}
        <CopilotChat />
      </div>
    </CopilotKit>
  );
}

export default App;

```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run this FIRST to catch syntax errors
npm run lint

# Expected: No errors.
```

### Level 2: Unit Tests
```bash
# No new unit tests are required for this step.
```

### Level 3: Integration Test
```bash
# 1. Start the development server
npm run dev

# 2. Open the application in a web browser (e.g., http://localhost:5173)

# 3. Visually inspect the result.
# Expected: The 3D viewer should be visible, and the CopilotKit chat bubble
# should be visible in the corner of the screen. Clicking it should open the
# chat window.
```

## Final validation Checklist
- [ ] No linting errors: `npm run lint`
- [ ] Manual test successful: The chat UI appears and is interactive.
- [ ] Application loads without runtime errors in the browser console.
