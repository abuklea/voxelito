import json
import os
import sys

# Add the current directory to sys.path to ensure we can import api.index
sys.path.append(os.getcwd())

from api.index import AgentResponse, SceneDescription, ChunkResponse

def generate_schema():
    # Generate JSON schema for the AgentResponse model
    schema = AgentResponse.model_json_schema()

    # We can also generate for other models if needed, or combine them
    # For now, AgentResponse includes SceneDescription, so that's covered.

    # Let's also verify ChunkResponse is available if frontend needs it
    chunk_schema = ChunkResponse.model_json_schema()

    output_dir = os.path.join("src", "generated")
    os.makedirs(output_dir, exist_ok=True)

    with open(os.path.join(output_dir, "agent_response_schema.json"), "w") as f:
        json.dump(schema, f, indent=2)

    with open(os.path.join(output_dir, "chunk_response_schema.json"), "w") as f:
        json.dump(chunk_schema, f, indent=2)

    print(f"Schemas generated in {output_dir}")

if __name__ == "__main__":
    generate_schema()
