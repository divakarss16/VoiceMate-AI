"""
Evon 30B AI Reasoning and Response Generation Service.

Evon (gnani-evon-v3.3-30B-A3B) is Gnani.ai's open-weights hybrid MoE LLM.
Unlike Prisma and Timbre which have public managed cloud endpoints on api.vachana.ai,
Evon 30B is released as an open-weights model on Hugging Face for self-hosted or dedicated inference.

This service connects to any OpenAI-compatible or dedicated inference endpoint hosting Evon 30B
(configured via GNANI_EVON_API_URL and GNANI_EVON_API_KEY).
If no endpoint is configured or available, it reports the precise status and architecture details
transparently without faking responses.
"""
import os
import requests
import logging

logger = logging.getLogger(__name__)

class EvonService:
    def __init__(self, endpoint_url=None, api_key=None):
        self.endpoint_url = endpoint_url or os.getenv("GNANI_EVON_API_URL", "").strip()
        self.api_key = api_key or os.getenv("GNANI_EVON_API_KEY", "").strip()
        self.model_name = "gnani-evon-v3.3-30B-A3B"

    def is_configured(self):
        return bool(self.endpoint_url)

    def generate_response(self, prompt, system_instruction=None, max_tokens=512, temperature=0.7):
        """
        Generate reasoning/response from Evon 30B inference endpoint.
        
        :param prompt: User question/prompt
        :param system_instruction: System prompt to steer response
        :param max_tokens: Maximum tokens to generate
        :param temperature: Sampling temperature
        :return: dict with success, response_text, model, or structured error message.
        """
        if not prompt or not prompt.strip():
            return {
                "success": False,
                "error": "Prompt cannot be empty.",
                "status_code": 400
            }

        if not self.endpoint_url:
            return {
                "success": False,
                "error": (
                    "Evon 30B is an open-weights model (gnani/gnani-evon-v3.3-30B-A3B on Hugging Face) "
                    "and does not have a default managed public cloud REST endpoint like Prisma and Timbre. "
                    "To enable Evon 30B reasoning, host the model weights (via vLLM, Ollama, or llama.cpp) "
                    "and provide GNANI_EVON_API_URL in your .env file."
                ),
                "is_model_hosted": False,
                "model": self.model_name,
                "status_code": 501
            }

        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["X-API-Key-ID"] = self.api_key

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        else:
            messages.append({
                "role": "system",
                "content": "You are VoiceMate AI, a helpful, polite, and intelligent voice assistant powered by Gnani AI."
            })
        messages.append({"role": "user", "content": prompt.strip()})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        try:
            logger.info(f"Dispatching inference request to Evon 30B endpoint: {self.endpoint_url}")
            response = requests.post(
                self.endpoint_url,
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                resp_json = response.json()
                # Support OpenAI format or direct response format
                if "choices" in resp_json and len(resp_json["choices"]) > 0:
                    answer = resp_json["choices"][0].get("message", {}).get("content", "")
                elif "response" in resp_json:
                    answer = resp_json["response"]
                elif "generated_text" in resp_json:
                    answer = resp_json["generated_text"]
                else:
                    answer = str(resp_json)

                return {
                    "success": True,
                    "response": answer,
                    "model": self.model_name,
                    "is_model_hosted": True,
                    "raw": resp_json
                }
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("error", {}).get("message") or error_json.get("message") or response.text
                except Exception:
                    pass

                return {
                    "success": False,
                    "error": f"Evon 30B inference endpoint returned error ({response.status_code}): {error_detail}",
                    "is_model_hosted": True,
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Evon 30B inference request timed out after 60 seconds.",
                "status_code": 504
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Unable to reach Evon 30B inference endpoint at {self.endpoint_url}: {str(e)}",
                "status_code": 502
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error during Evon 30B inference: {str(e)}",
                "status_code": 500
            }

