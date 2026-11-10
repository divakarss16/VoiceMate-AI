"""
Timbre Text-to-Speech (TTS) Service Integration for Gnani.ai API.
Endpoint: POST https://api.vachana.ai/api/v1/tts/inference
Header: X-API-Key-ID: <api_key>
Content-Type: application/json
"""
import os
import uuid
import requests
import logging

logger = logging.getLogger(__name__)

class TimbreService:
    def __init__(self, api_key=None, base_url=None, output_dir=None):
        self.api_key = api_key or os.getenv("GNANI_API_KEY", "").strip()
        self.base_url = (base_url or os.getenv("GNANI_BASE_URL", "https://api.vachana.ai")).rstrip("/")
        self.endpoint = f"{self.base_url}/api/v1/tts/inference"
        self.output_dir = output_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_audio")
        os.makedirs(self.output_dir, exist_ok=True)

    def synthesize_speech(self, text, voice="Avinash", model="timbre-v3.0", speed=1.0, container="wav", sample_rate=16000):
        """
        Convert text to speech using Gnani Timbre API.
        
        :param text: Text string to synthesize (supports inline audio tags on timbre-v3.0)
        :param voice: Voice name from catalog (e.g., 'Avinash', 'Chetana', 'Lakshmi', 'Nalini', 'Pranav')
        :param model: TTS model ('timbre-v3.0' or 'timbre-v2.5')
        :param speed: Speech rate multiplier (e.g. 1.0)
        :param container: Audio container format ('wav', 'mp3', etc.)
        :param sample_rate: Audio sample rate in Hz (default: 16000)
        :return: dict with success status, audio filename, filepath, and error details if any.
        """
        if not self.api_key:
            return {
                "success": False,
                "error": "Gnani API Key is missing. Please set GNANI_API_KEY in your .env file.",
                "status_code": 401
            }

        if not text or not text.strip():
            return {
                "success": False,
                "error": "Text is required for speech synthesis.",
                "status_code": 400
            }

        headers = {
            "Content-Type": "application/json",
            "X-API-Key-ID": self.api_key
        }

        payload = {
            "text": text.strip(),
            "voice": voice,
            "model": model,
            "speed": float(speed),
            "audio_config": {
                "encoding": "linear_pcm",
                "container": container,
                "num_channels": 1,
                "sample_rate": sample_rate,
                "sample_width": 2
            }
        }

        try:
            logger.info(f"Sending TTS request to {self.endpoint} for voice={voice}, model={model}")
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                # The response is typically audio binary (e.g. wav/mp3)
                content_type = response.headers.get("Content-Type", "")
                
                # Check if response returned JSON error despite 200 (edge-case defensive coding)
                if "application/json" in content_type:
                    try:
                        resp_json = response.json()
                        if not resp_json.get("success", True) and "error" in resp_json:
                            return {
                                "success": False,
                                "error": resp_json.get("error", "Unknown TTS error"),
                                "status_code": 400
                            }
                    except Exception:
                        pass

                ext = ".wav"
                if "mpeg" in content_type or "mp3" in content_type:
                    ext = ".mp3"

                audio_filename = f"tts_{uuid.uuid4().hex[:12]}{ext}"
                audio_path = os.path.join(self.output_dir, audio_filename)

                with open(audio_path, "wb") as f:
                    f.write(response.content)

                return {
                    "success": True,
                    "filename": audio_filename,
                    "filepath": audio_path,
                    "url": f"/audio/generated/{audio_filename}",
                    "voice": voice,
                    "model": model,
                    "size_bytes": len(response.content)
                }
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message") or error_json.get("error") or response.text
                except Exception:
                    pass

                logger.error(f"Timbre API error {response.status_code}: {error_detail}")
                return {
                    "success": False,
                    "error": f"Gnani Timbre API error ({response.status_code}): {error_detail}",
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Timbre API request timed out after 60 seconds.",
                "status_code": 504
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network communication error connecting to Gnani Timbre API: {str(e)}",
                "status_code": 502
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error during speech synthesis: {str(e)}",
                "status_code": 500
            }

