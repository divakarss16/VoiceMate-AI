"""
VoiceMate AI Assistant / LLM Reasoning Service.

Supports Groq's high-speed OpenAI-compatible chat completions API
(or any custom OpenAI-compatible endpoint configured in .env).
"""
import os
import requests
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are VoiceMate AI Assistant, an advanced, highly intelligent conversational partner integrated into the VoiceMate AI voice platform.

Guidelines for your responses:
1. Tone & Clarity: Be engaging, polite, natural, and helpful. Use clear, accessible English. When explaining technical topics or complex phenomena, explain concepts in simple, intuitive terms first before diving deeper.
2. Structure & Depth:
   - For technical, procedural, or coding questions, provide structured, step-by-step explanations with well-commented, practical code examples.
   - Adjust your depth to match the user's intent: concise and direct for quick questions, comprehensive and well-organized for deep topics.
3. Natural Voice Compatibility: Your response will be read aloud by an automated text-to-speech voice engine (Gnani Timbre). 
   - Keep opening thoughts clean and easy to listen to.
   - Avoid excessive ASCII walls, unnecessary repetition, or clunky filler phrases.
4. Truthfulness & Accuracy: Never fabricate information, library versions, or statistics. If you are uncertain or the question lacks context, admit it openly and ask for clarification.
5. Conversational Continuity: Maintain context across follow-up turns in the conversation."""

class EvonService:
    def __init__(self, endpoint_url=None, api_key=None, model_name=None):
        raw_url = (endpoint_url or os.getenv("GNANI_EVON_API_URL", "https://api.groq.com/openai/v1")).strip().rstrip("/")
        # Ensure completions path is properly formatted
        if not raw_url.endswith("/chat/completions"):
            if raw_url.endswith("/v1"):
                self.endpoint_url = f"{raw_url}/chat/completions"
            else:
                self.endpoint_url = f"{raw_url}/chat/completions"
        else:
            self.endpoint_url = raw_url

        self.api_key = api_key or os.getenv("GNANI_EVON_API_KEY", "").strip()
        # Default verified active chat model on Groq
        self.model_name = model_name or os.getenv("GNANI_AI_MODEL", "openai/gpt-oss-120b").strip()
        self.provider = "Groq (OpenAI-compatible)" if "groq.com" in self.endpoint_url else "OpenAI-compatible Endpoint"

    def is_configured(self):
        return bool(self.api_key and self.endpoint_url)

    def generate_response(self, prompt, conversation_history=None, system_instruction=None, max_tokens=1024, temperature=0.7):
        """
        Generate chat response using Groq / OpenAI-compatible chat completions.
        
        :param prompt: User question/prompt
        :param conversation_history: List of previous dicts: [{"role": "user"|"assistant", "content": "..."}]
        :param system_instruction: System prompt to steer response (defaults to SYSTEM_PROMPT)
        :param max_tokens: Maximum tokens to generate
        :param temperature: Sampling temperature
        :return: dict with success, response, model, or structured error message.
        """
        if not prompt or not prompt.strip():
            return {
                "success": False,
                "error": "Prompt cannot be empty.",
                "status_code": 400
            }

        if not self.api_key:
            return {
                "success": False,
                "error": "AI Assistant API Key is missing. Please set GNANI_EVON_API_KEY in your .env file.",
                "is_configured": False,
                "status_code": 401
            }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        messages = []
        # Inject strong system instruction
        active_system = system_instruction or SYSTEM_PROMPT
        messages.append({"role": "system", "content": active_system})

        # Inject conversation history (sanitize to user & assistant roles only)
        if conversation_history and isinstance(conversation_history, list):
            for msg in conversation_history[-8:]: # keep last 8 turns for optimal context window
                role = msg.get("role")
                content = msg.get("content", "").strip()
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        # Append current user prompt
        messages.append({"role": "user", "content": prompt.strip()})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        try:
            logger.info(f"Dispatching AI chat completion to {self.endpoint_url} using model '{self.model_name}' (messages: {len(messages)})")
            response = requests.post(
                self.endpoint_url,
                headers=headers,
                json=payload,
                timeout=45
            )

            if response.status_code == 200:
                resp_json = response.json()
                answer = ""
                if "choices" in resp_json and len(resp_json["choices"]) > 0:
                    choice = resp_json["choices"][0]
                    answer = choice.get("message", {}).get("content", "")
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
                    "provider": self.provider,
                    "is_configured": True
                }
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = (
                        error_json.get("error", {}).get("message")
                        or error_json.get("message")
                        or response.text
                    )
                except Exception:
                    pass

                logger.error(f"AI Assistant API error ({response.status_code}): {error_detail}")
                return {
                    "success": False,
                    "error": f"AI Assistant API error ({response.status_code}): {error_detail}",
                    "is_configured": True,
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "AI Assistant API request timed out after 45 seconds.",
                "status_code": 504
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Unable to reach AI Assistant endpoint at {self.endpoint_url}: {str(e)}",
                "status_code": 502
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error during AI generation: {str(e)}",
                "status_code": 500
            }
