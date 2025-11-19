import { Viewer } from "./features/viewer/Viewer";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

function App() {
  return (
    <CopilotKit runtimeUrl="/api/generate">
      <div style={{ height: "100vh", width: "100vw" }}>
        <Viewer />
        <CopilotChat />
      </div>
    </CopilotKit>
  );
}

export default App;
