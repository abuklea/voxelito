"""
Verification script to check OpenAI API connectivity.
"""
import os
from openai import OpenAI

def verify_openai():
    """
    Checks if the OPENAI_API_KEY is set and attempts to make a simple API call
    to verify that the key is valid and the client can connect.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found in environment.")
        return

    print(f"Found API Key: {api_key[:5]}...{api_key[-4:]}")

    client = OpenAI(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model="gpt-4o", # Or gpt-3.5-turbo
            messages=[
                {"role": "user", "content": "Hello, are you working?"}
            ],
            max_tokens=10
        )
        print("Success! OpenAI response:")
        print(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling OpenAI: {e}")

if __name__ == "__main__":
    verify_openai()
