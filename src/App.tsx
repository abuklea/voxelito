import React, { Suspense, useState, useEffect } from 'react';
import { CopilotKit, useCopilotChat, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { InteractionController } from "./features/viewer/InteractionController";
import { SelectionHighlighter } from "./features/viewer/SelectionHighlighter";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import { useVoxelStore } from './store/voxelStore';
import { Toolbar } from './components/Toolbar';
import type { SceneData } from './types';
import ErrorBoundary from './ErrorBoundary';
import { NeonLogo } from './components/NeonLogo';
import "@copilotkit/react-ui/styles.css";

/**
 * Header component displaying the logo and build status.
 */
const Header = () => (
  <header style={{
    height: '80px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
    justifyContent: 'space-between'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <NeonLogo />
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      ALPHA BUILD
    </div>
  </header>
);

/**
 * The main application logic component.
 */
function VoxelApp() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const { selectedVoxels } = useVoxelStore();

  const { visibleMessages, isLoading } = useCopilotChat();

  // --- Context for the Agent ---

  // 1. Scene Data
  useCopilotReadable({
    description: "The current 3D scene structure (chunks and voxels).",
    value: sceneData
  });

  // 2. Selection
  useCopilotReadable({
    description: "The current set of selected voxels. If non-empty, only modify these voxels or the area around them.",
    value: selectedVoxels
  });

  // 3. Screenshot
  useCopilotReadable({
    description: "A screenshot of the current 3D viewport (Base64 encoded JPEG).",
    value: () => {
       if (voxelWorld) {
           return voxelWorld.renderer.domElement.toDataURL('image/jpeg', 0.5);
       }
       return "No viewport available";
    }
  });

  useEffect(() => {
    if (!isLoading && visibleMessages.length > 0) {
      const lastMessage = visibleMessages[visibleMessages.length - 1];

      if (lastMessage.isTextMessage() && lastMessage.role === "assistant" && lastMessage.content) {
        try {
          let content = lastMessage.content;
          // Handle Markdown blocks if present
          if (content.includes("```json")) {
              content = content.split("```json")[1].split("```")[0];
          } else if (content.includes("```")) {
               content = content.split("```")[1].split("```")[0];
          }

          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.chunks)) {
            console.log("Valid scene data received, updating viewer...");
            setSceneData(parsed as SceneData);
          } else {
            console.log("Received JSON but not valid scene data:", parsed);
          }
        } catch (e) {
           console.log("Last message content was not JSON:", lastMessage.content);
        }
      }
    }
  }, [isLoading, visibleMessages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      <Header />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Viewer ref={ref} />
        <InteractionController voxelWorld={voxelWorld} />
        <SelectionHighlighter voxelWorld={voxelWorld} />
        <Toolbar />
        <Suspense fallback={<div style={{ color: 'white', padding: '20px' }}>Loading Voxel Engine...</div>}>
          {voxelWorld && sceneData && (
            <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
          )}
        </Suspense>
      </div>
      <CopilotPopup
        instructions="You are a helper that generates 3D voxel scenes. You can see the current scene and selection."
        labels={{
          title: "Voxelito",
          initial: "Describe a scene to generate!",
        }}
      />
    </div>
  );
}

/**
 * Root component that sets up the ErrorBoundary and CopilotKit context provider.
 */
function App() {
  return (
    <ErrorBoundary>
      <CopilotKit runtimeUrl="http://localhost:8000/api/generate">
        <VoxelApp />
      </CopilotKit>
    </ErrorBoundary>
  );
}

export default App;
