import React, { Suspense, useState, useEffect } from 'react';
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { Viewer } from "./features/viewer/Viewer";
import { SceneManager } from "./features/voxel-engine/SceneManager";
import { InteractionController } from "./features/viewer/InteractionController";
import { SelectionHighlighter } from "./features/viewer/SelectionHighlighter";
import { useVoxelWorld } from './hooks/useVoxelWorld';
import type { SceneData } from './types';
import ErrorBoundary from './ErrorBoundary';
import { NeonLogo } from './components/NeonLogo';
import "@copilotkit/react-ui/styles.css";

const SIZES = {
  Small: "32x32x32",
  Medium: "64x64x64",
  Large: "128x128x128",
  "Extra Large": "256x256x256"
};

interface HeaderProps {
  size: string;
  setSize: (s: string) => void;
}

const Header: React.FC<HeaderProps> = ({ size, setSize }) => (
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <NeonLogo />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Size:</label>
          <select
            value={size}
            onChange={e => setSize(e.target.value)}
            style={{
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #555'
            }}
          >
            {Object.entries(SIZES).map(([label, val]) => (
                <option key={label} value={label}>{label} ({val})</option>
            ))}
          </select>
      </div>
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
      ALPHA BUILD
    </div>
  </header>
);

function VoxelApp() {
  const { voxelWorld, ref } = useVoxelWorld();
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [size, setSize] = useState("Medium");

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
          }
        } catch (e) {
           // Ignore non-JSON
        }
      }
    }
  }, [isLoading, visibleMessages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      <Header size={size} setSize={setSize} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Viewer ref={ref} />
        <InteractionController voxelWorld={voxelWorld} />
        <SelectionHighlighter voxelWorld={voxelWorld} />
        <Suspense fallback={<div style={{ color: 'white', padding: '20px' }}>Loading Voxel Engine...</div>}>
          {voxelWorld && sceneData && (
            <SceneManager sceneData={sceneData} voxelWorld={voxelWorld} />
          )}
        </Suspense>
      </div>
      <CopilotPopup
        instructions={`You are a voxel scene generator. The user has selected the scene size: ${size} (${SIZES[size as keyof typeof SIZES]}). Ensure your generated shapes fit loosely within this volume. Center the scene at 0,0,0 roughly.`}
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
