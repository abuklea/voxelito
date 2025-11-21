import React, { Suspense, useState, useEffect } from 'react';
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
import ErrorBoundary from './ErrorBoundary';
import "@copilotkit/react-ui/styles.css";

// Header Component
const Header = () => (
  <header style={{
    height: '60px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
    justifyContent: 'space-between'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '20px',
        height: '20px',
        backgroundColor: 'var(--accent-primary)',
        boxShadow: '0 0 10px var(--accent-primary)'
      }} />
      <h1 style={{
        margin: 0,
        fontSize: '1.2rem',
        color: 'var(--text-primary)',
        textShadow: '2px 2px 0px var(--accent-primary)'
      }}>
        VOXEL<span style={{ color: 'var(--accent-secondary)' }}>ITO</span>
      </h1>
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      ALPHA BUILD
    </div>
  </header>
);

function VoxelApp() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);

  const { visibleMessages, isLoading } = useCopilotChat();

  useEffect(() => {
    if (!isLoading && visibleMessages.length > 0) {
      const lastMessage = visibleMessages[visibleMessages.length - 1];

      if (lastMessage.isTextMessage() && lastMessage.role === "assistant" && lastMessage.content) {
        try {
          const parsed = JSON.parse(lastMessage.content);
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
        <Suspense fallback={<div style={{ color: 'white', padding: '20px' }}>Loading Voxel Engine...</div>}>
          {voxelWorld && sceneData && (
            <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
          )}
        </Suspense>
      </div>
      <CopilotPopup
        instructions="You are a helper that generates 3D voxel scenes."
        labels={{
          title: "Voxelito",
          initial: "Describe a scene to generate!",
        }}
      />
    </div>
  );
}

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
