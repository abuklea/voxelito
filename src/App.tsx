import { Viewer } from "./features/viewer/Viewer";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function App() {
  return (
    <CopilotKit runtimeUrl="/api/generate">
      <div style={{ height: "100vh", width: "100vw" }}>
        <h1
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            zIndex: 1,
            color: "white",
            fontSize: "1.5rem",
          }}
        >
          Voxelito
        </h1>
        <Viewer />
        <div
          style={{
            position: "absolute",
            top: "6rem",
            right: "1rem",
            width: "400px",
            height: "calc(100vh - 7rem)",
            zIndex: 1,
            border: "1px solid #495057",
            backgroundColor: "rgba(30, 30, 30, 0.75)",
          }}
        >
          <CopilotChat
            labels={{
              title: "Voxelito Chat",
              initial: "Welcome to Voxelito! How can I help you create today?",
            }}
          />
        </div>
      </div>
    </CopilotKit>
  );
}

export default App;
