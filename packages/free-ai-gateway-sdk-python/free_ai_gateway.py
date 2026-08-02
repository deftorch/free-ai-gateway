"""
Free AI Gateway Python Client SDK (free_ai_gateway)
Zero-dependency lightweight Python SDK for Free AI Gateway.
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

class FreeAIGatewayClient:
    def __init__(self, gateway_token: Optional[str] = None, api_key: Optional[str] = None, base_url: str = "http://localhost:3000/v1"):
        self.base_url = base_url.rstrip("/")
        self.token = gateway_token or api_key
        self.chat = self.ChatNamespace(self)
        self.messages = self.MessagesNamespace(self)
        self.models = self.ModelsNamespace(self)

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            headers["x-api-key"] = self.token
        return headers

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=self._get_headers(), method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            raise RuntimeError(f"Gateway HTTP Error {e.code}: {err_body}")

    def _get(self, path: str) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(url, headers=self._get_headers(), method="GET")
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            raise RuntimeError(f"Gateway HTTP Error {e.code}: {err_body}")

    class ChatNamespace:
        def __init__(self, client):
            self.client = client
            self.completions = self.CompletionsNamespace(client)

        class CompletionsNamespace:
            def __init__(self, client):
                self.client = client

            def create(self, model: str = "auto", messages: List[Dict[str, Any]] = None, temperature: float = 0.7) -> Dict[str, Any]:
                payload = {
                    "model": model,
                    "messages": messages or [],
                    "temperature": temperature
                }
                return self.client._post("/chat/completions", payload)

    class MessagesNamespace:
        def __init__(self, client):
            self.client = client

        def create(self, model: str, messages: List[Dict[str, Any]], max_tokens: int = 1024) -> Dict[str, Any]:
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens
            }
            return self.client._post("/messages", payload)

    class ModelsNamespace:
        def __init__(self, client):
            self.client = client

        def list(self) -> Dict[str, Any]:
            return self.client._get("/models")
