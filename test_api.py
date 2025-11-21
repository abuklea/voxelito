import requests
import json
import sys

def test_discovery():
    print("Testing Discovery...")
    url = "http://localhost:8000/api/generate"
    payload = {
        "operationName": "availableAgents",
        "variables": {},
        "query": "query availableAgents { availableAgents { agents { name description id __typename } __typename } }"
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_chat():
    print("\nTesting Chat Stream...")
    url = "http://localhost:8000/api/generate"
    # Minimal CopilotKit payload approximation
    payload = {
        "messages": [
            {"role": "user", "content": "Generate a cube."}
        ]
    }
    # If AGUIAdapter expects something specific, we might fail here if payload is wrong.
    # But let's see what the logs say.
    try:
        response = requests.post(url, json=payload, stream=True)
        print(f"Status: {response.status_code}")
        for line in response.iter_lines():
            if line:
                print(f"Chunk: {line.decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_discovery()
    test_chat()
