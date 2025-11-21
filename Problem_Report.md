# Problem Report: Backend 500 Errors and Protocol Mismatch

**Date:** 2025-11-21
**Author:** Jules

## 1. Executive Summary

The initial issue of the `CopilotKit` UI not rendering was successfully resolved by switching from the embedded `<CopilotChat />` component (which was hidden by `overflow: hidden`) to the floating `<CopilotPopup />`. The chat button now appears and is clickable.

However, verified testing revealed that the chat functionality is currently broken. Initial attempts to use a custom stream handler resulted in empty message content on the frontend. Subsequent attempts to use the official `AGUIAdapter` from `pydantic-ai` resulted in `500 Internal Server Error` responses.

The primary blocker is now a combination of:
1.  **Missing API Key:** The `OPENAI_API_KEY` is not present in the sandbox environment, preventing `pydantic-ai` agents from initializing.
2.  **Protocol Mismatch/Debugging:** Without a valid agent, attempts to debug the stream format (custom vs. adapter) are hindered by `500` errors.

## 2. Issues Identified

### 2.1. Missing `OPENAI_API_KEY`
- **Symptom:** `get_agent()` returns `None`.
- **Logs:** `DEBUG: Initializing Agent...` followed by `500` and response body `{"error": "Agent not initialized"}`.
- **Root Cause:** The environment variable is missing in the current shell session.

### 2.2. Backend 500 Errors with `AGUIAdapter`
- **Symptom:** Requests to `/api/generate` return `500`.
- **Diagnosis:** The `AGUIAdapter` implementation in `api/index.py` (added to fix protocol issues) depends on a valid `Agent` instance. Since the agent is `None`, the adapter logic is either skipped (returning the error) or crashes if forced with an invalid agent.
- **Observation:** Even when mock logic was used previously, the `CopilotKit` frontend received empty content strings, suggesting the stream format `data: <json>` was not being parsed correctly by the client.

### 2.3. Frontend Message Parsing
- **Symptom:** `Last message structure: {"content":"","role":"assistant"...}`.
- **Diagnosis:** The frontend `useCopilotChat` hook expects a specific stream of events to populate the `content`. The custom handler used initially `yield f"data: {json.dumps(scene_data)}\n\n"` likely violated the expected protocol (e.g., expecting `data: "token"` deltas).

## 3. Current State of Codebase

### `api/index.py`
The backend is currently configured to attempt using `AGUIAdapter` with extensive debug logging. It falls back to a custom handler if the adapter is missing, but the adapter is present.
```python
# ... logging setup ...
@app.post("/api/generate")
async def run_agent_custom(request: Request):
    if AGUIAdapter:
        try:
            print("DEBUG: Initializing Agent...", file=sys.stderr)
            agent = get_agent()
            if not agent:
                return JSONResponse({"error": "Agent not initialized"}, status_code=500)

            # ... Manual AGUI handling ...
            run_input = await AGUIAdapter.from_request(request)
            adapter = AGUIAdapter(agent)
            stream = adapter.run_stream(run_input)
            return StreamingResponse(stream_with_logging(stream), media_type="text/event-stream")
        except BaseException as e:
            # ... error logging ...
```

### `src/App.tsx`
The frontend uses `CopilotPopup` and includes debug logging to inspect message content.
```tsx
// ...
      <CopilotPopup
        instructions="You are a helper that generates 3D voxel scenes."
        labels={{
          title: "Voxel Assistant",
          initial: "Describe a scene to generate!",
        }}
      />
// ...
```

### `verify.spec.js`
The test script is updated to click the "Open Chat" button (CopilotPopup default) and poll for the success log message. It dumps all logs on failure.

## 4. Steps to Reproduce

1.  **Start the environment:**
    ```bash
    npm run dev > frontend.log 2>&1 &
    uvicorn api.index:app --port 8000 > backend.log 2>&1 &
    ```
2.  **Run the verification test:**
    ```bash
    npx playwright test verify.spec.js
    ```
3.  **Observe failure:**
    The test will timeout waiting for the "Valid scene data" log. The console logs will show `500 Internal Server Error` or empty message content.

## 5. Recommended Next Steps

1.  **Provide `OPENAI_API_KEY`:** Securely set this environment variable in `api/.env.local`.
2.  **Verify Agent Initialization:** Ensure `get_agent()` returns a valid agent.
3.  **Debug Stream Format:**
    *   If using `AGUIAdapter`: Ensure the `ag-ui-protocol` package version matches what `CopilotKit` expects.
    *   If using Custom Handler: Reverse engineer the expected SSE format (likely `data: "string_chunk"`).
4.  **Frontend Parsing:** Once the stream sends content, ensure `App.tsx` correctly parses the JSON string from `lastMessage.content`.
