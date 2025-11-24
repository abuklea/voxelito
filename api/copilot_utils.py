import json
from typing import List, Dict, Any, Optional

class CopilotResponseBuilder:
    @staticmethod
    def build_response(
        content: str,
        role: str = "assistant",
        msg_id: str = "msg_response"
    ) -> Dict[str, Any]:
        """
        Constructs a GraphQL-like response for CopilotKit.
        """
        return {
            "data": {
                "generateCopilotResponse": {
                    "messages": [
                        {
                            "__typename": "TextMessageOutput",
                            "content": [content],
                            "role": role,
                            "id": msg_id
                        }
                    ]
                }
            }
        }

    @staticmethod
    def format_sse(response_data: Dict[str, Any]) -> str:
        """
        Formats the dictionary as a Server-Sent Event (SSE) string.
        """
        return f"data: {json.dumps(response_data)}\n\n"

    @staticmethod
    def create_error_response(error_message: str) -> str:
        """
        Creates a formatted error response.
        """
        error_json = json.dumps({
            "error": {
                "type": "internal",
                "message": error_message
            }
        })
        response = CopilotResponseBuilder.build_response(
            content=error_json,
            role="assistant",
            msg_id="msg_error"
        )
        return CopilotResponseBuilder.format_sse(response)

    @staticmethod
    def create_success_response(commentary: str, data: Optional[Dict[str, Any]] = None) -> str:
        """
        Creates a formatted success response with optional JSON data block.
        """
        response_text = commentary

        if data:
            json_str = json.dumps(data)
            response_text += f"\n\n```json\n{json_str}\n```"

        response = CopilotResponseBuilder.build_response(content=response_text)
        return CopilotResponseBuilder.format_sse(response)
