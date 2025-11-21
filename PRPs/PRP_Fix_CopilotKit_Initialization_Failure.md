name: "PRP - Fix CopilotKit Initialization Failure"
description: |
  This PRP addresses the persistent issue where the CopilotKit chat UI fails to appear. The root cause has been identified as a layout/component misuse issue: `CopilotChat` (an embedded component) is being used instead of `CopilotPopup` (the floating button), and is being pushed off-screen by the full-screen 3D viewer.

## Goal
Fix the "silent rendering failure" of the CopilotKit UI so that the chat button appears and is usable.

## Why
- The chat interface is the primary way users interact with the application.
- Currently, the button is invisible, blocking all further development and testing of the chat features.

## What
- Replace `<CopilotChat />` with `<CopilotPopup />` in `src/App.tsx`.
- `CopilotPopup` provides the floating button behavior expected by the user and the test script.
- Verify that the button appears and functions correctly.

### Success Criteria
- [ ] The `CopilotKit` chat button is visible on the screen.
- [ ] The `verify.spec.js` Playwright test passes (specifically, finding the button).
- [ ] Chat functionality remains intact.

## All Needed Context

### Documentation & References
- `src/App.tsx`: The file where `CopilotChat` is currently misused.
- `src/index.css`: CSS that enforces `overflow: hidden`, hiding the off-screen chat component.
- CopilotKit Docs: Confirming `CopilotPopup` is the correct component for a floating chat button.

### Current Codebase tree
```bash
src
├── App.tsx
├── features
│   └── viewer
│       └── Viewer.tsx
└── index.css
```

### Desired Codebase tree
No new files, but `src/App.tsx` will be modified.

### Known Gotchas of our codebase & Library Quirks
- The backend `api/index.py` expects a streaming response for chat and JSON for discovery. The current setup in `App.tsx` handles this, but we must ensure `CopilotPopup` is compatible with the existing `runtimeUrl`.
- `CopilotPopup` might have different props than `CopilotChat`. We need to ensure we pass the correct props (e.g., `instructions`, `labels`).

## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
MODIFY src/App.tsx:
  - Import `CopilotPopup` from `@copilotkit/react-ui`.
  - Remove `CopilotChat` import and usage.
  - Add `<CopilotPopup />` to the component tree.
  - Pass `instructions` and `labels` props to `CopilotPopup` to ensure a good user experience.
  - Ensure it is rendered *outside* or *on top of* the `Viewer` (though being fixed position, order matters less, but good practice).

Task 2:
VERIFY with verify.spec.js:
  - Run `npx playwright test verify.spec.js` to confirm the button is found and clicked.
```

### Per task pseudocode as needed added to each task

```typescript
// Task 1: src/App.tsx

import { CopilotPopup } from "@copilotkit/react-ui"; // Change import

// ... inside App function return ...
return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Viewer ref={ref} />
      <Suspense fallback={<div>Loading Voxel Engine...</div>}>
        {voxelWorld && sceneData && (
          <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
        )}
      </Suspense>

      {/* Replace CopilotChat with CopilotPopup */}
      <CopilotPopup
        instructions="You are a helper that generates 3D voxel scenes."
        labels={{
            title: "Voxel Assistant",
            initial: "Describe a scene to generate!",
        }}
      />
    </div>
);
```
