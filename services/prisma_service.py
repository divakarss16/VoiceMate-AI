"""
Prisma Speech-to-Text (STT) Service Integration for Gnani.ai API.
Endpoint: POST https://api.vachana.ai/stt/v3
Header: X-API-Key-ID: <api_key>
"""
import os
import requests
import logging

logger = logging.getLogger(__name__)

class PrismaService:
    def __init__(self, api_key=None, base_url=None):
        self.api_key = api_key or os.getenv("GNANI_API_KEY", "").strip()
        self.base_url = (base_url or os.getenv("GNANI_BASE_URL", "https://api.vachana.ai")).rstrip("/")
        self.endpoint = f"{self.base_url}/stt/v3"

    def transcribe_audio(self, audio_file_path, model="prisma-v3.0", language_code="indic-auto", output_format="transcribe", keyterms=None, topic=None):
        """
        Transcribe an audio file using Gnani Prisma API.
        
        :param audio_file_path: Absolute path to local audio file (.wav, .mp3, .ogg, .flac, etc.)
        :param model: Prisma model identifier (e.g. 'prisma-v3.0', 'prisma-v2.5')
        :param language_code: Target or hint language (e.g. 'en-IN', 'indic-auto', 'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', etc.)
        :param output_format: 'transcribe', 'verbatim', 'codemix', or 'transliterate'
        :param keyterms: Optional comma-separated string or list of terms to bias recognition accuracy
        :param topic: Optional topic description text (up to 1,600 characters)
        :return: dict with success status, transcript, metadata, and error details if any.
        """
        if not self.api_key:
            return {
                "success": False,
                "error": "Gnani API Key is missing. Please set GNANI_API_KEY in your .env file.",
                "status_code": 401
            }

        if not os.path.exists(audio_file_path):
            return {
                "success": False,
                "error": f"Audio file not found: {audio_file_path}",
                "status_code": 404
            }

        headers = {
            "X-API-Key-ID": self.api_key
        }

        # Determine MIME type based on extension
        ext = os.path.splitext(audio_file_path)[1].lower()
        mime_types = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".m4a": "audio/mp4",
            ".flac": "audio/flac",
            ".webm": "audio/webm"
        }
        content_type = mime_types.get(ext, "application/octet-stream")
        filename = os.path.basename(audio_file_path)

        data = {
            "language_code": language_code,
            "format": output_format
        }

        # Only pass model if explicitly requested; if prisma-v2.5, omit to use server default or pass explicitly
        if model:
            data["model"] = model

        # Keyterms and topic are only supported on prisma-v3.0 per Gnani documentation
        if model == "prisma-v3.0":
            if keyterms and str(keyterms).strip():
                data["keyterms"] = str(keyterms).strip()
            if topic and str(topic).strip():
                data["topic"] = str(topic).strip()[:1600]

        try:
            with open(audio_file_path, "rb") as f:
                file_bytes = f.read()
                file_size = len(file_bytes)

            logger.info(f"Sending audio transcription request to {self.endpoint}: filename='{filename}', size={file_size} bytes, content_type='{content_type}', model={model}, lang={language_code}, format={output_format}")

            files = {
                "audio_file": (filename, file_bytes, content_type)
            }
            response = requests.post(
                self.endpoint,
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )

            logger.info(f"Prisma API raw response status: {response.status_code}")

            if response.status_code == 200:
                resp_json = response.json()
                logger.info(f"Prisma API raw response body: {resp_json}")
                transcript = resp_json.get("transcript") or resp_json.get("text") or resp_json.get("data", {}).get("transcript", "")
                detected_lang = resp_json.get("detected_language_code") or resp_json.get("language_code", language_code)

                return {
                    "success": True,
                    "transcript": transcript,
                    "detected_language": detected_lang,
                    "model": resp_json.get("model", model),
                    "request_id": resp_json.get("request_id"),
                    "processing_time": resp_json.get("processing_time"),
                    "end_to_end_latency": resp_json.get("end_to_end_latency"),
                    "raw_response": resp_json
                }
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message") or error_json.get("error") or response.text
                except Exception:
                    pass

                logger.error(f"Prisma API error {response.status_code}: {error_detail}")
                return {
                    "success": False,
                    "error": f"Gnani Prisma API error ({response.status_code}): {error_detail}",
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Prisma API request timed out after 60 seconds.",
                "status_code": 504
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Network communication error connecting to Gnani API: {str(e)}",
                "status_code": 502
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error during transcription: {str(e)}",
                "status_code": 500
            }

